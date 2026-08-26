"use client";

import { useEffect, useState, useCallback } from "react";
import { getDestinations, type AdminDestinationRow } from "@/lib/admin/data";
import { createDestination, updateDestination, deactivateDestination, reactivateDestination } from "@/lib/admin/mutations";
import { Pill, TableSkeleton, EmptyState, ErrorRetry, ConfirmDialog, AdminButton, useLiveAnnouncer } from "@/components/admin/ui";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/admin/guard";

type Action = "deactivate" | "reactivate";

export function DestinationsClient() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<AdminDestinationRow[] | null>(null);
  const [error, setError] = useState(false);
  const [target, setTarget] = useState<{ id: string; name: string; action: Action } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDestinationRow | null>(null);
  const { announce, region } = useLiveAnnouncer();

  const load = useCallback(() => {
    setError(false);
    getDestinations(false).then(setDestinations).catch(() => setError(true));
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const active = (destinations ?? []).filter((d) => d.is_active).length;
  const inactive = (destinations ?? []).filter((d) => !d.is_active).length;

  async function runAction(reason: string) {
    if (!target) return;
    try {
      if (target.action === "deactivate") await deactivateDestination(target.id);
      if (target.action === "reactivate") await reactivateDestination(target.id);
      void reason;
      announce("Action completed.");
      setTarget(null);
      load();
    } catch (err) {
      announce(err instanceof Error ? err.message : "Action failed.");
      setTarget(null);
    }
  }

  if (error) return <ErrorRetry message="Couldn't load destinations." onRetry={load} />;

  return (
    <div>
      {region}
      <div className="mb-1 flex items-start justify-between">
        <h1 className="font-display text-[26px] font-bold">Destinations</h1>
        {can(user, "destination.manage") && (
          <AdminButton variant="primary" onClick={() => setCreateOpen(true)}>
            + Add Destination
          </AdminButton>
        )}
      </div>
      <p className="mb-6 text-[13px] text-[oklch(50%_0.01_255)]">
        {destinations ? `${active} active · ${inactive} removed` : "Loading…"} — this is the curated list users can pick from when creating or
        searching a trip. Removing a destination hides it from every picker without deleting past trips.
      </p>

      {!destinations ? (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <TableSkeleton rows={5} cols={5} />
        </div>
      ) : destinations.length === 0 ? (
        <EmptyState title="No destinations yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[oklch(90%_0.005_255)] bg-white">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[oklch(92%_0.003_255)] bg-[oklch(98%_0.002_255)] text-left text-[11px] font-bold text-[oklch(50%_0.01_255)]">
                <th scope="col" className="px-4 py-3">Destination</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Order</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((d) => (
                <tr key={d.id} className="border-b border-[oklch(94%_0.003_255)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-[10.5px] text-[oklch(55%_0.01_255)]">{d.tagline ?? d.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-[oklch(40%_0.01_255)]">{d.category ?? "—"}</td>
                  <td className="px-4 py-3">{d.sort_order}</td>
                  <td className="px-4 py-3">
                    <Pill tone={d.is_active ? "verified" : "suspended"}>{d.is_active ? "active" : "removed"}</Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {can(user, "destination.manage") && (
                        <AdminButton onClick={() => setEditing(d)}>Edit</AdminButton>
                      )}
                      {d.is_active && can(user, "destination.manage") && (
                        <AdminButton variant="danger" onClick={() => setTarget({ id: d.id, name: d.name, action: "deactivate" })}>
                          Remove
                        </AdminButton>
                      )}
                      {!d.is_active && can(user, "destination.manage") && (
                        <AdminButton onClick={() => setTarget({ id: d.id, name: d.name, action: "reactivate" })}>
                          Restore
                        </AdminButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={target?.action === "deactivate"}
        title="Remove destination"
        consequence={`Hides ${target?.name} from every destination picker and search. Past trips to ${target?.name} are unaffected and can still be viewed.`}
        confirmLabel="Remove"
        requireReason={false}
        onConfirm={runAction}
        onCancel={() => setTarget(null)}
      />
      <ConfirmDialog
        open={target?.action === "reactivate"}
        title="Restore destination"
        consequence={`Makes ${target?.name} selectable again in every destination picker and search.`}
        confirmLabel="Restore"
        danger={false}
        requireReason={false}
        onConfirm={runAction}
        onCancel={() => setTarget(null)}
      />

      {createOpen && (
        <DestinationDialog
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            announce("Destination created.");
            load();
          }}
        />
      )}
      {editing && (
        <DestinationDialog
          mode="edit"
          destination={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            announce("Destination updated.");
            load();
          }}
        />
      )}
    </div>
  );
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function DestinationDialog({
  mode,
  destination,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  destination?: AdminDestinationRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(destination?.name ?? "");
  const [slug, setSlug] = useState(destination?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [category, setCategory] = useState(destination?.category ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(destination?.cover_image_url ?? "");
  const [tagline, setTagline] = useState(destination?.tagline ?? "");
  const [description, setDescription] = useState(destination?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(destination?.sort_order ?? 0));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Destination name is required.");
      return;
    }
    if (mode === "create" && !slug.trim()) {
      setError("Slug is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        await createDestination({
          name: name.trim(),
          slug: slug.trim(),
          category: category || undefined,
          coverImageUrl: coverImageUrl || undefined,
          tagline: tagline || undefined,
          description: description || undefined,
          sortOrder: sortOrder ? Number(sortOrder) : undefined,
        });
      } else if (destination) {
        await updateDestination(destination.id, {
          name: name.trim(),
          category: category || undefined,
          coverImageUrl: coverImageUrl || undefined,
          tagline: tagline || undefined,
          description: description || undefined,
          sortOrder: sortOrder ? Number(sortOrder) : undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save destination.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <form onSubmit={submit} className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-[16px] font-bold">{mode === "create" ? "Add destination" : `Edit ${destination?.name}`}</h2>
        <p className="mb-4 text-[12px] text-[oklch(50%_0.01_255)]">
          {mode === "create"
            ? "Adds a new destination to the curated list users can pick from."
            : "Changes apply everywhere this destination is shown — trip creation, search, and the public destinations page."}
        </p>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Name</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
        </div>

        {mode === "create" && (
          <div className="mb-3">
            <label className="mb-1 block text-[11.5px] font-semibold">Slug (used in URLs, can&apos;t be changed later)</label>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px] font-mono"
            />
          </div>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="mountains, beaches, heritage…"
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-semibold">Sort order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Cover image URL</label>
          <input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="/placeholders/manali.svg"
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-[11.5px] font-semibold">Tagline</label>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A short one-liner shown in listings"
            className="w-full rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[11.5px] font-semibold">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Shown on the destination's public page so travellers know what to expect."
            className="w-full resize-none rounded-lg border border-[oklch(85%_0.005_255)] px-3 py-2 text-[13px]"
          />
        </div>

        {error && <p className="mb-3 text-[12px] text-[oklch(45%_0.16_25)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <AdminButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" loading={submitting}>
            {mode === "create" ? "Create" : "Save"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
