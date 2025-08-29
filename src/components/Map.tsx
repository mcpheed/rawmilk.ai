"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// default marker icon fix
const Icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25,41],
  iconAnchor: [12,41]
});
(L.Marker.prototype as any).options.icon = Icon;

type Item = { id:string; name:string; address:string; lat:number; lng:number; verified:boolean; distanceKm:number; website?:string };

export default function Map({ center, items }:{ center:[number,number]; items:Item[] }) {
  return (
    <div className="w-full h-[60vh] rounded-2xl border overflow-hidden">
      <MapContainer center={center} zoom={12} style={{height:"100%", width:"100%"}}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        {items.map(m=>(
          <Marker key={m.id} position={[m.lat, m.lng]}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{m.name} {m.verified && "✅"}</div>
                <div className="text-sm">{m.address}</div>
                <div className="text-xs opacity-70">{m.distanceKm.toFixed(1)} km</div>
                {m.website && <a className="text-blue-600 text-sm" href={m.website} target="_blank">Website</a>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
