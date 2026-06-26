"use client"

import { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete"
import { useLoadScript } from "@react-google-maps/api"

import { Input } from "@/components/ui/input"
import { MapPin } from "lucide-react"

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const libraries: "places"[] = ["places"]

export interface AddressDetails {
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
}

interface MapPickerProps {
  defaultLatitude?: number | string | null
  defaultLongitude?: number | string | null
  onLocationSelect: (lat: number, lng: number, details?: AddressDetails) => void
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

function MapUpdater({ center }: { center: L.LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 16)
    }
  }, [center, map])
  return null
}

export function MapPicker({ defaultLatitude, defaultLongitude, onLocationSelect }: MapPickerProps) {
  const [position, setPosition] = useState<L.LatLng | null>(null)
  const [isClient, setIsClient] = useState(false)
  const mapRef = useRef<any>(null)

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
    language: "pt-BR",
    region: "BR"
  })

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "br" },
    },
    debounce: 300,
    initOnMount: isLoaded
  })

  useEffect(() => {
    setIsClient(true)
    if (defaultLatitude && defaultLongitude) {
      const pos = L.latLng(Number(defaultLatitude), Number(defaultLongitude))
      setPosition(pos)
      if (mapRef.current) {
        mapRef.current.setView(pos, 16)
      }
    }
  }, [defaultLatitude, defaultLongitude])

  const handleSelect = async (address: string) => {
    setValue(address, false)
    clearSuggestions()

    try {
      const results = await getGeocode({ address })
      const { lat, lng } = await getLatLng(results[0])
      
      const newPos = L.latLng(lat, lng)
      setPosition(newPos)
      if (mapRef.current) {
        mapRef.current.flyTo(newPos, 16)
      }

      // Extraindo dados estruturados
      const addressComponents = results[0].address_components
      const details: AddressDetails = {}

      addressComponents.forEach(component => {
        const types = component.types
        if (types.includes("route")) details.street = component.long_name
        if (types.includes("street_number")) details.number = component.long_name
        if (types.includes("sublocality") || types.includes("sublocality_level_1")) details.neighborhood = component.long_name
        if (types.includes("administrative_area_level_2")) details.city = component.long_name
        if (types.includes("administrative_area_level_1")) details.state = component.short_name
        if (types.includes("postal_code")) details.zipCode = component.long_name
      })

      onLocationSelect(lat, lng, details)
    } catch (error) {
      console.error("Erro ao obter coordenadas: ", error)
    }
  }

  if (!isClient) {
    return <div className="h-[300px] w-full rounded-md border bg-muted flex items-center justify-center text-muted-foreground">Carregando mapa...</div>
  }

  if (loadError) return <div>Erro ao carregar Google Maps</div>

  const center = position || L.latLng(-23.5505, -46.6333)

  return (
    <div className="space-y-3 w-full relative">
      <div className="relative">
        <div className="flex gap-2">
          <Input 
            placeholder="Pesquise seu estabelecimento ou endereço completo" 
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!ready}
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {status === "OK" && (
          <ul className="absolute top-full left-0 w-full bg-popover border border-border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto z-10 flex flex-col">
            {data.map(({ place_id, description }) => (
              <li 
                key={place_id} 
                className="px-3 py-2 text-sm text-popover-foreground hover:bg-muted cursor-pointer transition-colors border-b border-border last:border-0"
                onClick={() => handleSelect(description)}
              >
                {description}
              </li>
            ))}
          </ul>
        )}
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
          <MapUpdater center={position} />
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">O Google definiu as coordenadas. Arraste o mapa e clique caso queira ajustar o pino manualmente.</p>
    </div>
  )
}
