import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export function Select({ value, onChange, options, placeholder = 'Chọn...', className = '' }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${open ? 'z-50' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`
          w-full h-11 px-3 pr-9 rounded-xl border text-left text-sm
          flex items-center gap-2 transition-all cursor-pointer
          ${open
            ? 'border-ring ring-2 ring-ring/20 bg-background'
            : 'border-input bg-background hover:border-muted-foreground/40'
          }
          ${selectedOption ? 'text-foreground' : 'text-muted-foreground'}
        `}
      >
        <span className="truncate flex-1">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 mt-1.5 w-full min-w-[180px] rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
          >
            <div className="py-1 max-h-60 overflow-y-auto scrollbar-thin">
              {options.map((option) => {
                const isSelected = option.value === value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`
                      w-full px-3 py-2.5 text-sm text-left flex items-center justify-between gap-2
                      transition-colors cursor-pointer
                      ${isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-accent'
                      }
                    `}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="size-4 text-primary shrink-0" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
