import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];
const mapContainerStyle = { width: '100%', height: '300px' };
const defaultCenter = { lat: -23.55052, lng: -46.633309 }; // São Paulo

interface MapLocationPickerProps {
  initialData?: { latitude?: string | number | null; longitude?: string | number | null };
  onLocationChange: (data: any) => void;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({ initialData, onLocationChange }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [center, setCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState<{lat: number, lng: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteInitialized = useRef(false);

  useEffect(() => {
    if (initialData?.latitude && initialData?.longitude) {
      const pos = { lat: Number(initialData.latitude), lng: Number(initialData.longitude) };
      setCenter(pos);
      setMarkerPosition(pos);
    }
  }, [initialData]);

  const extractAddressComponents = (address_components: any[]) => {
    let street = '', number = '', neighborhood = '', city = '', state = '', zip = '';
    
    address_components.forEach(comp => {
      const types = comp.types;
      if (types.includes('route')) street = comp.long_name;
      if (types.includes('street_number')) number = comp.long_name;
      if (types.includes('sublocality') || types.includes('sublocality_level_1')) neighborhood = comp.long_name;
      if (types.includes('administrative_area_level_2')) city = comp.long_name;
      if (types.includes('administrative_area_level_1')) state = comp.short_name;
      if (types.includes('postal_code')) zip = comp.long_name;
    });

    return { street, number, neighborhood, city, state, zip };
  };

  const geocodePosition = (latLng: google.maps.LatLng) => {
    if (!window.google) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const components = extractAddressComponents(results[0].address_components);
        onLocationChange({
          ...components,
          latitude: latLng.lat(),
          longitude: latLng.lng()
        });
      }
    });
  };

  useEffect(() => {
    if (!isLoaded || !window.google || autocompleteInitialized.current || !containerRef.current) return;
    
    async function initAutocomplete() {
      try {
        // @ts-ignore
        const { PlaceAutocompleteElement } = await window.google.maps.importLibrary("places") as any;
        const autocomplete = new PlaceAutocompleteElement();
        
        // Estilização básica para o componente Web
        autocomplete.style.width = "100%";
        autocomplete.style.boxSizing = "border-box";
        
        containerRef.current?.appendChild(autocomplete);
        autocompleteInitialized.current = true;

        autocomplete.addEventListener('gmp-placeselect', async (e: any) => {
          const place = e.place;
          if (!place) return;

          await place.fetchFields({
            fields: ['location', 'addressComponents'],
          });

          if (!place.location) return;

          const latLng = place.location;
          const pos = { lat: latLng.lat(), lng: latLng.lng() };
          setCenter(pos);
          setMarkerPosition(pos);

          // O novo Place retorna propriedades um pouco diferentes do Geocoder antigo
          const comps = place.addressComponents?.map((c: any) => ({
            types: c.types,
            long_name: c.longText || c.name,
            short_name: c.shortText || c.name
          })) || [];

          const components = extractAddressComponents(comps);
          onLocationChange({
            ...components,
            latitude: pos.lat,
            longitude: pos.lng
          });
        });
      } catch (e) {
        console.error("Erro ao inicializar PlaceAutocompleteElement:", e);
      }
    }
    initAutocomplete();
  }, [isLoaded, onLocationChange]);

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const latLng = e.latLng;
    setMarkerPosition({ lat: latLng.lat(), lng: latLng.lng() });
    geocodePosition(latLng);
  };

  if (loadError) {
    return (
      <div className="p-4 text-center bg-red-50 border border-red-200 rounded-md text-red-600">
        Erro ao carregar o Google Maps. Verifique a chave de API.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-md text-slate-500">
        Carregando mapa...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div 
        ref={containerRef} 
        className="w-full flex"
        title="Busque o endereço do restaurante..."
      >
        {/* O PlaceAutocompleteElement será injetado aqui via ref */}
      </div>
      
      <div className="rounded-md overflow-hidden border border-slate-200 shadow-sm">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={15}
          center={center}
          options={{ disableDefaultUI: true, zoomControl: true }}
        >
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable={true}
              onDragEnd={handleMarkerDragEnd}
            />
          )}
        </GoogleMap>
      </div>
      <p className="text-sm text-slate-500 italic mt-1">
        Você pode arrastar o marcador (pino vermelho) no mapa para ajustar a localização exata do seu restaurante.
      </p>
    </div>
  );
};

export default MapLocationPicker;
