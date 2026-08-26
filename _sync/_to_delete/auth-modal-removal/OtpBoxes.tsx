"use client";

import { useRef, useState } from "react";

/**
 * 6-digit OTP input — auto-advance, backspace-to-previous, full-paste
 * distribution (truncated to 6 valid digits), auto-submit on completion.
 * Per OTP Screen spec.
 */
export function OtpBoxes({
  onComplete,
  disabled = false,
  shake = false,
}: {
  onComplete: (code: string) => void;
  disabled?: boolean;
  shake?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigit(index: number, value: string) {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      onComplete(next.join(""));
    }
  }

  function handleChange(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    setDigit(index, value);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const lastIndex = Math.min(pasted.length, 6) - 1;
    refs.current[lastIndex]?.focus();
    if (pasted.length === 6) onComplete(pasted);
  }

  return (
    <div className={`flex gap-2 ${shake ? "animate-[shake_300ms_ease-in-out]" : ""}`}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          maxLength={1}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of 6`}
          className="h-13 w-11 rounded-[10px] border-[1.5px] border-border-input text-center text-xl font-bold outline-none focus:border-primary disabled:opacity-50 font-sans"
          style={{ height: 52 }}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}
