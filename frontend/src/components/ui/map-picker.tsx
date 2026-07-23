"use client"

import { useState, useEffect, useRef } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
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

function LocationMarker({ position, setPosition, onLocationSelect, isGoogleLoaded }: any) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setPosition(e.latlng)
      
      if (isGoogleLoaded && window.google) {
        try {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const result = results[0]
              const addressComponents = result.address_components
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
            } else {
              onLocationSelect(lat, lng)
            }
          })
        } catch (error) {
          onLocationSelect(lat, lng)
        }
      } else {
        onLocationSelect(lat, lng)
      }
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
  const [authError, setAuthError] = useState<string | null>(null)
  const [selectedAddressPreview, setSelectedAddressPreview] = useState<{ lat: number; lng: number; details?: AddressDetails } | null>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).gm_authFailure = () => {
        console.error("[Google Maps] Erro de autenticação de chave ou referenciador (RefererNotAllowedMapError).")
        setAuthError("Erro de autorização no Google Maps: Certifique-se de que a API 'Places API (New)' está ativada e seu domínio está cadastrado nas restrições de HTTP Referrer da API Key.")
      }
    }
  }, [])

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries,
    language: "pt-BR",
    region: "BR"
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const sessionTokenRef = useRef<any>(null)

  // Inicializa o token de sessão do Autocomplete
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined" && window.google) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }, [isLoaded])

  // Busca debounced usando a nova API v2 (AutocompleteSuggestion)
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 3 || !isLoaded || !window.google) {
      setSuggestions([])
      return
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true)
      try {
        const { AutocompleteSuggestion } = await window.google.maps.importLibrary("places") as any
        
        const request = {
          input: searchTerm,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ["br"],
        }

        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        setSuggestions(results || [])
      } catch (err) {
        console.error("Erro ao buscar sugestões do Google Places:", err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchTerm, isLoaded])

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

  const handleSelect = async (description: string, placeId?: string) => {
    setSearchTerm(description)
    setSuggestions([])

    try {
      const geocoder = new window.google.maps.Geocoder()
      const geocodeQuery = placeId ? { placeId } : { address: description }

      geocoder.geocode(geocodeQuery, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const result = results[0]
          const lat = result.geometry.location.lat()
          const lng = result.geometry.location.lng()
          
          const newPos = L.latLng(lat, lng)
          setPosition(newPos)
          if (mapRef.current) {
            mapRef.current.flyTo(newPos, 16)
          }

          // Extraindo dados estruturados do Geocode
          const addressComponents = result.address_components
          const details: AddressDetails = {}

          addressComponents.forEach(component => {
            const types = component.types
            if (types.includes("route")) details.street = component.long_name
            if (types.includes("street_number")) details.number = component.long_name
            if (types.includes("sublocality") || types.includes("sublocality_level_1")) details.neighborhood = component.long_name
            if (types.includes("administrative_area_level_2")) details.city = component.long_name
            if (types.includes("administrative_area_level_1")) {
              details.state = component.short_name.replace(/[^a-zA-Z]/g, "").substring(0, 2).toUpperCase()
            }
            if (types.includes("postal_code")) details.zipCode = component.long_name
          })

          setSelectedAddressPreview({ lat, lng, details })
          onLocationSelect(lat, lng, details)
        } else {
          console.error("Erro no geocoding status:", status)
        }
      })
    } catch (error) {
      console.error("Erro ao obter coordenadas: ", error)
    }
  }

  const handleLocationSelectWrapper = (lat: number, lng: number, details?: AddressDetails) => {
    setSelectedAddressPreview({ lat, lng, details })
    onLocationSelect(lat, lng, details)
  }

  if (!isClient) {
    return <div className="h-[300px] w-full rounded-md border bg-muted flex items-center justify-center text-muted-foreground">Carregando mapa...</div>
  }

  if (loadError) return <div>Erro ao carregar Google Maps</div>

  const center = position || L.latLng(-23.5505, -46.6333)

  return (
    <div className="space-y-3 w-full relative">
      {authError && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            ⚠️ Autorização do Google Maps
          </p>
          <p>{authError}</p>
        </div>
      )}

      <div className="relative">
        <div className="flex gap-2">
          <Input 
            placeholder="Pesquise seu estabelecimento ou endereço completo" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 w-full bg-popover border border-border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto z-10 flex flex-col">
            {suggestions.map((suggestion) => {
              const placeId = suggestion.placePrediction.placeId
              const text = suggestion.placePrediction.text.toString()
              return (
                <li 
                  key={placeId} 
                  className="px-3 py-2 text-sm text-popover-foreground hover:bg-muted cursor-pointer transition-colors border-b border-border last:border-0"
                  onClick={() => handleSelect(text, placeId)}
                >
                  {text}
                </li>
              )
            })}
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
            onLocationSelect={handleLocationSelectWrapper}
            isGoogleLoaded={isLoaded}
          />
          <MapUpdater center={position} />
        </MapContainer>
      </div>

      {position && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-semibold text-primary">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Localização Selecionada
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </span>
          </div>
          {selectedAddressPreview?.details?.street && (
            <p className="text-muted-foreground">
              {selectedAddressPreview.details.street}
              {selectedAddressPreview.details.number ? `, ${selectedAddressPreview.details.number}` : ""}
              {selectedAddressPreview.details.city ? ` - ${selectedAddressPreview.details.city}` : ""}
              {selectedAddressPreview.details.state ? `/${selectedAddressPreview.details.state}` : ""}
            </p>
          )}
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 pt-0.5">
            💡 Localização atualizada no mapa. Clique no botão &quot;Salvar Alterações&quot; no rodapé para confirmar.
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">O Google definiu as coordenadas. Arraste o mapa e clique caso queira ajustar o pino manualmente.</p>
    </div>
  )
}
