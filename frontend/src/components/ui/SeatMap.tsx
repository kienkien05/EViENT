import React, { useMemo } from 'react'
import { Armchair } from 'lucide-react'

export interface Seat {
  id: string
  roomId: string
  row: string
  number: number
  isActive: boolean
}

export interface Room {
  id: string
  name: string
  rows: number
  seatsPerRow: number
  isActive: boolean
  seats: Seat[]
}

interface SeatMapProps {
  room: Room
  selectedSeats: Seat[]
  onSeatToggle: (seat: Seat) => void
  maxSelectable: number
  soldSeats?: string[]
}

export default function SeatMap({ room, selectedSeats, onSeatToggle, maxSelectable, soldSeats = [] }: SeatMapProps) {
  // Group seats by row
  const seatsByRow = useMemo(() => {
    const byRow: Record<string, Seat[]> = {}
    if (!room.seats) return byRow

    const seenIds = new Set<string>()

    room.seats.forEach((seat) => {
      if (!seat || !seat.row || !seat.id) return
      if (seenIds.has(seat.id)) return
      seenIds.add(seat.id)

      if (!byRow[seat.row]) byRow[seat.row] = []
      byRow[seat.row]!.push(seat)
    })

    // Sort each row by seat number
    Object.keys(byRow).forEach(row => {
      byRow[row]!.sort((a, b) => a.number - b.number)
    })

    return byRow
  }, [room.seats])

  const sortedRowKeys = useMemo(() => {
    return Object.keys(seatsByRow).sort((a, b) => {
      const numA = parseInt(a.replace(/[^\d]/g, ''), 10)
      const numB = parseInt(b.replace(/[^\d]/g, ''), 10)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      return a.localeCompare(b)
    })
  }, [seatsByRow])

  const isSeatSelected = (seat: Seat) => selectedSeats.some(s => s.id === seat.id)

  return (
    <div className="flex flex-col items-center mt-6 w-full max-w-full overflow-x-auto pb-4 custom-scrollbar">
      <div className="mb-4">
        <h4 className="font-semibold text-center mb-1 flex items-center justify-center gap-2">
          <Armchair className="size-4 text-primary" />
          {room.name}
        </h4>
        <div className="flex items-center justify-center gap-4 text-xs mt-2 mb-6">
          <div className="flex items-center gap-1.5">
            <div className="size-4 rounded bg-emerald-500" />
            <span>Trống</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-4 rounded bg-primary" />
            <span>Đang chọn</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-4 rounded bg-muted-foreground/30" />
            <span>Đã bán/Khóa</span>
          </div>
        </div>
      </div>

      <div className="w-fit mx-auto min-w-full px-4 flex flex-col items-center">
        {/* Screen Element */}
        <div className="w-full max-w-md mx-auto mb-10 flex flex-col items-center">
            <div className="w-full h-1.5 bg-gradient-to-b from-primary/40 to-transparent rounded-t-full shadow-[0_0_15px_rgba(var(--primary),0.3)]"></div>
            <div className="w-full flex justify-center mt-1 border-t border-primary/20 bg-muted/20 backdrop-blur-sm rounded-b-[100%] pb-1">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase pt-1">
                    Màn hình
                </p>
            </div>
        </div>

        {/* Seat Matrix */}
        <div className="flex flex-col gap-2.5">
          {sortedRowKeys.map((row) => {
            const rowSeats = seatsByRow[row]!
            return (
            <div key={row} className="flex items-center justify-center gap-3">
              <span className="w-12 text-center text-xs font-semibold text-muted-foreground shrink-0">{row}</span>
              <div className="flex gap-1.5">
                {rowSeats.map((seat, index) => {
                  const selected = isSeatSelected(seat)
                  /** 
                   * TODO: Support checking sold seats.
                   * Currently, we strictly rely on `isActive` which the admin sets. 
                   * A complete app would check sold seats across tickets.
                   */
                  const isAvailable = seat.isActive && !soldSeats.includes(`${seat.row}-${seat.number}`)
                  const canSelect = isAvailable && (selected || selectedSeats.length < maxSelectable)

                  return (
                    <button
                      key={`${seat.id}-${index}`}
                      onClick={() => onSeatToggle(seat)}
                      disabled={!isAvailable || (!selected && selectedSeats.length >= maxSelectable)}
                      className={`size-7 sm:size-8 rounded-md flex items-center justify-center text-[10px] sm:text-xs font-medium transition-all relative ${
                        selected
                          ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary ring-offset-1 ring-offset-background hover:bg-primary/90 hover:shadow-md'
                          : isAvailable
                            ? 'bg-emerald-500/90 text-white hover:bg-emerald-600 hover:shadow-md'
                            : 'bg-muted-foreground/30 text-muted-foreground/50 cursor-not-allowed'
                      } ${!canSelect && !selected ? 'opacity-50 cursor-not-allowed hover:bg-emerald-500/90' : ''}`}
                      title={!isAvailable ? 'Ghế không khả dụng' : `${seat.row} - Số ${seat.number}`}
                    >
                      {seat.number}
                    </button>
                  )
                })}
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
