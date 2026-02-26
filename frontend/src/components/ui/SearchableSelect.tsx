import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  searchPlaceholder?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  className = '',
  searchPlaceholder = 'Tìm kiếm...'
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const lowerSearch = searchTerm.toLowerCase();
    return options.filter((o) =>
      o.label.toLowerCase().includes(lowerSearch)
    );
  }, [options, searchTerm]);

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

  // Manage open state side effects
  useEffect(() => {
    if (open) {
      setSearchTerm('') // Reset search when opened
      // Focus on search input slightly after animation starts
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false)
      }
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
            className="absolute z-50 mt-1.5 w-full min-w-[180px] rounded-xl border border-border bg-popover shadow-xl overflow-hidden flex flex-col max-h-[300px]"
          >
            {/* Search Input Area */}
            <div className="p-2 border-b border-border bg-muted/30 sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-ring transition-shadow"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="py-1 overflow-y-auto scrollbar-thin flex-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                  Không tìm thấy kết quả
                </div>
              ) : (
                filteredOptions.map((option) => {
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
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
