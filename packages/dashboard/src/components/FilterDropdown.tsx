import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export interface FilterOption {
  value: string;
  label: string;
  badge?: ReactNode;
  dotColor?: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  ariaLabel: string;
  className?: string;
}

export function FilterDropdown({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const isFiltered = value !== "all";

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const currentIndex = options.findIndex((o) => o.value === value);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % options.length;
      onChange(options[nextIndex].value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  }

  function handleSelect(val: string) {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className={`ts-filter-container ${className}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ts-filter-trigger w-full"
        data-active={isFiltered}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.badge ? (
            selectedOption.badge
          ) : selectedOption?.dotColor ? (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: selectedOption.dotColor,
                boxShadow: `0 0 6px ${selectedOption.dotColor}`,
              }}
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{selectedOption?.label ?? value}</span>
        </span>

        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--text-dim)" }}
          aria-hidden="true"
        >
          <path
            d="M3.5 6L8 10.5L12.5 6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          className="ts-filter-menu"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="ts-filter-item"
                onClick={() => handleSelect(opt.value)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {opt.badge ? (
                    opt.badge
                  ) : opt.dotColor ? (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: opt.dotColor,
                        boxShadow: `0 0 6px ${opt.dotColor}`,
                      }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="truncate">{opt.label}</span>
                </div>

                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="shrink-0"
                    style={{ color: "var(--accent)" }}
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8.5L6.5 12L13 4.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
