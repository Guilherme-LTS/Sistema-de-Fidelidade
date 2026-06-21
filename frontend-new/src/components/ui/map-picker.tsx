"use client"

import { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

// Fix para os ícones do Leaflet no React
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

interface MapPickerProps {
  defaultLatitude?: number | string | null
  defaultLongitude?: number | string | null
  onLocationSelect: (lat: number, lng: number, addressDetails?: any) => void
}

function LocationMarker({ position, setPosition, onLocationSelect }: any) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng)
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })

  return position === null ? null : (
    <Marker position={position}></Marker>
  )
}

export function MapPicker({ defaultLatitude, defaultLongitude, onLocationSelect }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isClient, setIsClient] = useState(false)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    setIsClient(true)
    if (defaultLatitude && defaultLongitude) {
      setPosition(L.latLng(Number(defaultLatitude), Number(defaultLongitude)))
    }
  }, [defaultLatitude, defaultLongitude])

  const handleSearch = async () => {
    if (!searchQuery) return
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        const newPos = L.latLng(parseFloat(lat), parseFloat(lon))
        setPosition(newPos)
        if (mapRef.current) {
          mapRef.current.flyTo(newPos, 16)
        }
        onLocationSelect(parseFloat(lat), parseFloat(lon), data[0])
      }
    } catch (err) {
      console.error("Erro ao buscar endereço", err)
    }
  }

  if (!isClient) {
    return <div className="h-[300px] w-full rounded-md border bg-muted flex items-center justify-center text-muted-foreground">Carregando mapa...</div>
  }

  const center = position || L.latLng(-23.5505, -46.6333) // Default to SP se não houver coords

  return (
    <div className="space-y-3 w-full">
      <div className="flex gap-2">
        <Input 
          placeholder="Buscar endereço (ex: Av Paulista, 1000)" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
        />
        <Button type="button" onClick={handleSearch} variant="secondary">
          <Search className="w-4 h-4 mr-2" />
          Buscar
        </Button>
      </div>
      
      <div className="h-[300px] w-full rounded-md overflow-hidden border relative z-0">
        <MapContainer 
          center={center} 
          zoom={position ? 16 : 13} 
          scrollWheelZoom={true} 
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            onLocationSelect={onLocationSelect} 
          />
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">Clique no mapa para definir a localização exata do seu estabelecimento.</p>
    </div>
  )
}
