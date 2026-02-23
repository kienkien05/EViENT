import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-sm hidden md:flex items-center">
      <Search className="absolute left-3 size-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Tìm kiếm sự kiện, mã vé..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-10 pl-9 pr-4 rounded-full border border-input bg-muted/50 outline-none focus:bg-background focus:ring-2 focus:ring-primary transition-all text-sm"
      />
    </form>
  )
}
