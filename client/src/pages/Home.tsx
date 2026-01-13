import LeafletMap from "@/components/LeafletMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Save, Download, Upload, FileJson, FileSpreadsheet } from "lucide-react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { Crosshair, MapPin, Navigation, Zap, Plus, Trash2, List, History, Layers, Search, Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number }>({ lat: 35.6812, lng: 139.7671 }); // Default to Tokyo
  const [isTracking, setIsTracking] = useState(false);
  const [markedLocations, setMarkedLocations] = useState<{id: string, lat: number, lng: number, timestamp: string, name?: string, note?: string, rank?: number, prefecture?: string}[]>(() => {
    const saved = localStorage.getItem("markedLocations");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("markedLocations", JSON.stringify(markedLocations));
  }, [markedLocations]);
  const [isListOpen, setIsListOpen] = useState(false);
  const [locationHistory, setLocationHistory] = useState<{ lat: number; lng: number }[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [mapStyle, setMapStyle] = useState<"dark" | "satellite" | "standard">("dark");
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<{name: string, note: string, rank: number, prefecture: string} | null>(null);
  const [filterRank, setFilterRank] = useState<number | null>(null);
  const [filterPrefecture, setFilterPrefecture] = useState<string | null>(null);
  const [showTargetNames, setShowTargetNames] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watchIdRef = useRef<number | null>(null);

  // Initial location fetch
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(pos);
        toast.success("システムオンライン: 現在地を取得しました");
      },
      () => {
        toast.error("位置情報の取得に失敗しました");
      }
    );
  }, []);

  const fetchPrefecture = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
      const data = await response.json();
      // Extract prefecture (state in Nominatim response usually corresponds to prefecture in Japan)
      return data.address?.province || data.address?.state || "Unknown";
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Unknown";
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Get prefecture
        const prefecture = result.address?.province || result.address?.state || await fetchPrefecture(lat, lng);
        
        const newLocation = {
          id: crypto.randomUUID(),
          lat,
          lng,
          timestamp: new Date().toLocaleTimeString(),
          name: result.display_name.split(",")[0],
          rank: 1,
          prefecture
        };
    
        setMarkedLocations(prev => [...prev, newLocation]);
        setSearchQuery("");
        setSearchResults([]);
        toast.success(`場所を追加しました: ${newLocation.name}`);
      } else {
        toast.error("場所が見つかりませんでした");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("検索中にエラーが発生しました");
    } finally {
      setIsSearching(false);
    }
  };

  const addLocation = async () => {
    const prefecture = await fetchPrefecture(currentLocation.lat, currentLocation.lng);
    const newLocation = {
      id: crypto.randomUUID(),
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      timestamp: new Date().toLocaleTimeString(),
      name: "Marked Location",
      rank: 1,
      prefecture
    };
    setMarkedLocations(prev => [...prev, newLocation]);
    toast.success("ターゲット座標を記録しました");
  };

  const removeLocation = (id: string) => {
    setMarkedLocations(prev => prev.filter(loc => loc.id !== id));
    toast.info("ターゲット座標を削除しました");
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const prefecture = await fetchPrefecture(lat, lng);
    const newLocation = {
      id: crypto.randomUUID(),
      lat,
      lng,
      timestamp: new Date().toLocaleTimeString(),
      name: "Selected Location",
      note: "",
      rank: 1,
      prefecture
    };
    setMarkedLocations(prev => [...prev, newLocation]);
    toast.success("指定座標をマークしました");
  };

  const handleMarkerClick = (targetId: string) => {
    const target = markedLocations.find(loc => loc.id === targetId);
    if (target) {
      setSelectedTargetId(targetId);
      setEditingTarget({
        name: target.name || "Target",
        note: target.note || "",
        rank: target.rank || 1,
        prefecture: target.prefecture || "Unknown"
      });
    }
  };

  const filteredLocations = markedLocations.filter(loc => {
    if (filterRank && (loc.rank || 1) !== filterRank) return false;
    if (filterPrefecture && (loc.prefecture || "Unknown") !== filterPrefecture) return false;
    return true;
  });

  const uniquePrefectures = Array.from(new Set(markedLocations.map(loc => loc.prefecture || "Unknown"))).sort();

  const saveTargetDetails = () => {
    if (!selectedTargetId || !editingTarget) return;
    
    setMarkedLocations(prev => prev.map(loc => 
      loc.id === selectedTargetId 
        ? { ...loc, name: editingTarget.name, note: editingTarget.note, rank: editingTarget.rank, prefecture: editingTarget.prefecture }
        : loc
    ));
    
    toast.success("ターゲット情報を更新しました");
    setSelectedTargetId(null);
    setEditingTarget(null);
  };

  const exportData = (format: 'json' | 'csv') => {
    if (markedLocations.length === 0) {
      toast.error("エクスポートするデータがありません");
      return;
    }

    let content = "";
    let mimeType = "";
    let extension = "";

    if (format === 'json') {
      content = JSON.stringify(markedLocations, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else {
      // CSV Header
      const headers = ["id", "name", "lat", "lng", "timestamp", "note", "rank", "prefecture"];
      const rows = markedLocations.map(loc => [
        loc.id,
        `"${(loc.name || "").replace(/"/g, '""')}"`,
        loc.lat,
        loc.lng,
        `"${loc.timestamp}"`,
        `"${(loc.note || "").replace(/"/g, '""')}"`,
        loc.rank || 1,
        `"${(loc.prefecture || "").replace(/"/g, '""')}"`
      ]);
      content = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      mimeType = "text/csv";
      extension = "csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gps-targets-${new Date().toISOString().slice(0,10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${format.toUpperCase()}形式でエクスポートしました`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        let newLocations: any[] = [];

        if (file.name.endsWith(".json")) {
          newLocations = JSON.parse(content);
        } else if (file.name.endsWith(".csv")) {
          const lines = content.split("\n");
          const headers = lines[0].split(",").map(h => h.trim());
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Simple CSV parsing (doesn't handle commas inside quotes perfectly but works for basic export)
            // For better CSV parsing, a library would be recommended, but we'll use a simple regex for now
            const values: string[] = [];
            let inQuote = false;
            let currentValue = "";
            
            for (let char of lines[i]) {
              if (char === '"') {
                inQuote = !inQuote;
              } else if (char === ',' && !inQuote) {
                values.push(currentValue);
                currentValue = "";
              } else {
                currentValue += char;
              }
            }
            values.push(currentValue);

            const loc: any = {};
            headers.forEach((header, index) => {
              let value = values[index]?.trim();
              if (value?.startsWith('"') && value?.endsWith('"')) {
                value = value.slice(1, -1).replace(/""/g, '"');
              }
              
              if (header === "lat" || header === "lng") {
                loc[header] = parseFloat(value);
              } else if (header === "rank") {
                loc[header] = parseInt(value) || 1;
              } else {
                loc[header] = value;
              }
            });
            
            if (loc.lat && loc.lng) {
              if (!loc.id) loc.id = crypto.randomUUID();
              if (!loc.timestamp) loc.timestamp = new Date().toLocaleTimeString();
              newLocations.push(loc);
            }
          }
        }

        if (Array.isArray(newLocations) && newLocations.length > 0) {
          // Validate and merge
          const validLocations = newLocations.filter(l => l.lat && l.lng && !isNaN(l.lat) && !isNaN(l.lng));
          
          setMarkedLocations(prev => {
            // Avoid duplicates by ID
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = validLocations.filter(l => !existingIds.has(l.id));
            return [...prev, ...uniqueNew];
          });
          
          toast.success(`${validLocations.length}件のターゲットをインポートしました`);
        } else {
          toast.error("有効なデータが見つかりませんでした");
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("ファイルの読み込みに失敗しました");
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const toggleTracking = usePersistFn(() => {
    if (isTracking) {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      toast.info("追跡モード: 停止");
    } else {
      // Start tracking
      if (!navigator.geolocation) {
        toast.error("このブラウザは位置情報をサポートしていません");
        return;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(pos);
          setLocationHistory(prev => [...prev, pos]);
        },
        (error) => {
          console.error(error);
          toast.error("位置情報の追跡中にエラーが発生しました");
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
      setIsTracking(true);
      toast.success("追跡モード: 起動中");
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background text-foreground font-sans selection:bg-neon-cyan selection:text-black">
      {/* Background Overlay for Tech Feel */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-20 bg-[url('/images/tech-overlay.png')] bg-cover mix-blend-screen"></div>
      
      {/* Header / HUD Top */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-start pointer-events-none">
        <div className="glass-panel px-6 py-3 rounded-br-2xl border-l-4 border-l-neon-cyan pointer-events-auto flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-neon-cyan tracking-widest neon-text">
              CYBER<span className="text-white">TRACK</span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <div className={`w-2 h-2 rounded-full ${isTracking ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
              {isTracking ? "SYSTEM ONLINE" : "SYSTEM STANDBY"}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-neon-cyan hover:text-white hover:bg-neon-cyan/20"
            onClick={() => setIsListOpen(!isListOpen)}
          >
            <List className="w-6 h-6" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="pointer-events-auto flex-1 max-w-md mx-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neon-cyan/50 group-focus-within:text-neon-cyan transition-colors" />
            </div>
            <input
              type="text"
              className="w-full bg-black/60 border border-neon-cyan/30 text-neon-cyan placeholder:text-neon-cyan/30 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all font-mono text-sm backdrop-blur-sm"
              placeholder="SEARCH LOCATION OR PHONE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <div className="absolute inset-0 rounded-full border border-neon-cyan/20 pointer-events-none group-hover:border-neon-cyan/40 transition-colors"></div>
          </div>
        </div>

        <div className="glass-panel px-3 py-1.5 rounded-bl-2xl border-r-4 border-r-neon-pink pointer-events-auto">
          <div className="text-[8px] text-neon-pink font-mono mb-0.5 text-right">COORDINATES</div>
          <div className="font-mono text-sm font-bold text-white tracking-wider">
            {currentLocation ? (
              <>
                {currentLocation.lat.toFixed(4)} <span className="text-muted-foreground">N</span> / {currentLocation.lng.toFixed(4)} <span className="text-muted-foreground">E</span>
              </>
            ) : (
              <span className="animate-pulse">ACQUIRING SIGNAL...</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Map Area */}
      <main className="absolute inset-0 z-0">
        <LeafletMap 
          center={currentLocation}
          zoom={15}
          markers={filteredLocations.map(loc => ({
            id: loc.id,
            lat: loc.lat,
            lng: loc.lng,
            title: loc.name || `Target`,
            rank: loc.rank || 1,
            showLabel: showTargetNames
          }))}
          path={showHistory ? locationHistory : []}
          onMapClick={handleMapClick}
          onMarkerClick={handleMarkerClick}
          mapStyle={mapStyle}
        />
      </main>

      {/* Target Detail Panel */}
      <div 
        className={`absolute top-24 right-4 z-30 w-80 transition-transform duration-300 ease-in-out ${
          selectedTargetId ? "translate-x-0" : "translate-x-[120%]"
        }`}
      >
        <Card className="glass-panel border-neon-pink/30 text-foreground overflow-hidden flex flex-col">
          <div className="p-3 border-b border-neon-pink/20 bg-neon-pink/5 flex justify-between items-center">
            <h3 className="font-display font-bold text-neon-pink flex items-center gap-2">
              <MapPin className="w-4 h-4" /> TARGET DETAILS
            </h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-neon-pink hover:text-white hover:bg-neon-pink/20"
              onClick={() => {
                setSelectedTargetId(null);
                setEditingTarget(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="p-4 space-y-4">
            {editingTarget && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="target-rank" className="text-xs font-mono text-muted-foreground">RANK (COLOR)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((rank) => (
                      <button
                        key={rank}
                        onClick={() => setEditingTarget({...editingTarget, rank})}
                        className={`flex-1 h-8 rounded border transition-all ${
                          editingTarget.rank === rank 
                            ? "border-white ring-1 ring-white" 
                            : "border-transparent opacity-50 hover:opacity-100"
                        }`}
                        style={{
                          backgroundColor: 
                            rank === 1 ? "#ff0055" : 
                            rank === 2 ? "#ffaa00" : 
                            rank === 3 ? "#00ff00" : 
                            "#0088ff"
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground text-right">
                    {editingTarget.rank === 1 ? "RED (RANK 1)" : 
                     editingTarget.rank === 2 ? "ORANGE (RANK 2)" : 
                     editingTarget.rank === 3 ? "GREEN (RANK 3)" : 
                     "BLUE (RANK 4)"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-prefecture" className="text-xs font-mono text-muted-foreground">PREFECTURE</Label>
                  <Input 
                    id="target-prefecture"
                    value={editingTarget.prefecture}
                    readOnly
                    className="bg-black/20 border-white/5 text-white/70 font-mono text-sm cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-name" className="text-xs font-mono text-muted-foreground">TARGET NAME</Label>
                  <Input 
                    id="target-name"
                    value={editingTarget.name}
                    onChange={(e) => setEditingTarget({...editingTarget, name: e.target.value})}
                    className="bg-black/40 border-white/10 focus:border-neon-pink/50 text-white font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-note" className="text-xs font-mono text-muted-foreground">NOTES</Label>
                  <Textarea 
                    id="target-note"
                    value={editingTarget.note}
                    onChange={(e) => setEditingTarget({...editingTarget, note: e.target.value})}
                    className="bg-black/40 border-white/10 focus:border-neon-pink/50 text-white font-mono text-sm min-h-[100px]"
                    placeholder="Add notes here..."
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button 
                    size="sm" 
                    className="bg-neon-pink hover:bg-pink-600 text-white font-mono text-xs"
                    onClick={saveTargetDetails}
                  >
                    <Save className="w-3 h-3 mr-2" /> SAVE DATA
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Target List Panel */}
      <div 
        className={`absolute top-24 left-4 z-20 w-80 transition-transform duration-300 ease-in-out ${
          isListOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        <Card className="glass-panel border-neon-cyan/30 text-foreground overflow-hidden flex flex-col max-h-[calc(100vh-150px)]">
          <div className="p-3 border-b border-neon-cyan/20 bg-neon-cyan/5 flex justify-between items-center">
            <h3 className="font-display font-bold text-neon-cyan flex items-center gap-2">
              <Crosshair className="w-4 h-4" /> TARGET LIST
            </h3>
            <div className="flex items-center gap-2">
              {/* Filter Controls */}
              <div className="flex gap-1 mr-2">
                <select 
                  className="bg-black/40 border border-neon-cyan/30 text-neon-cyan text-[10px] rounded h-6 px-1 focus:outline-none focus:border-neon-cyan"
                  value={filterRank || ""}
                  onChange={(e) => setFilterRank(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">ALL RANKS</option>
                  <option value="1">RANK 1 (RED)</option>
                  <option value="2">RANK 2 (ORG)</option>
                  <option value="3">RANK 3 (GRN)</option>
                  <option value="4">RANK 4 (BLU)</option>
                </select>
                
                <select 
                  className="bg-black/40 border border-neon-cyan/30 text-neon-cyan text-[10px] rounded h-6 px-1 focus:outline-none focus:border-neon-cyan max-w-[80px]"
                  value={filterPrefecture || ""}
                  onChange={(e) => setFilterPrefecture(e.target.value || null)}
                >
                  <option value="">ALL AREAS</option>
                  {uniquePrefectures.map(pref => (
                    <option key={pref} value={pref}>{pref}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-neon-cyan hover:text-white hover:bg-neon-cyan/20"
                        onClick={() => exportData('json')}
                      >
                        <FileJson className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>JSONエクスポート</p></TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-neon-cyan hover:text-white hover:bg-neon-cyan/20"
                        onClick={() => exportData('csv')}
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>CSVエクスポート</p></TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-neon-cyan hover:text-white hover:bg-neon-cyan/20"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>インポート (JSON/CSV)</p></TooltipContent>
                  </Tooltip>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json,.csv" 
                    onChange={handleImport} 
                  />
                </TooltipProvider>
              </div>
              <span className="text-xs font-mono bg-neon-cyan/20 px-2 py-0.5 rounded text-neon-cyan">
                {filteredLocations.length}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {filteredLocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm font-mono">
                NO TARGETS FOUND
              </div>
            ) : (
              filteredLocations.map((loc, index) => (
                    <div 
                      key={loc.id} 
                      className={`group relative bg-black/40 border p-3 rounded transition-all cursor-pointer ${
                        selectedTargetId === loc.id 
                          ? "border-neon-pink bg-neon-pink/10" 
                          : "border-white/10 hover:border-neon-pink/50 hover:bg-neon-pink/5"
                      }`}
                      onDoubleClick={() => {
                        setCurrentLocation({ lat: loc.lat, lng: loc.lng });
                        handleMarkerClick(loc.id);
                        toast.info(`ターゲットへ移動: ${loc.name || "Unknown Location"}`);
                      }}
                    >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-mono ${
                        (loc.rank || 1) === 1 ? "text-[#ff0055]" :
                        (loc.rank || 1) === 2 ? "text-[#ffaa00]" :
                        (loc.rank || 1) === 3 ? "text-[#00ff00]" :
                        "text-[#0088ff]"
                      }`}>TARGET {index + 1}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1 rounded">
                        {loc.prefecture || "Unknown"}
                      </span>
                    </div>
                    <button 
                      onClick={() => removeLocation(loc.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm font-medium text-white truncate mb-1">{loc.name || "Unknown Location"}</div>
                  <div className="font-mono text-[10px] text-muted-foreground grid grid-cols-2 gap-1">
                    <span>LAT: {loc.lat.toFixed(4)}</span>
                    <span>LNG: {loc.lng.toFixed(4)}</span>
                    <span className="col-span-2 text-white/50">{loc.timestamp}</span>
                  </div>
                  <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-300 ${
                    (loc.rank || 1) === 1 ? "bg-[#ff0055]" :
                    (loc.rank || 1) === 2 ? "bg-[#ffaa00]" :
                    (loc.rank || 1) === 3 ? "bg-[#00ff00]" :
                    "bg-[#0088ff]"
                  }`}></div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Controls */}
      <footer className="absolute bottom-8 left-0 right-0 z-10 px-8 flex justify-between items-end pointer-events-none">
        {/* Status Panel */}
        <div className="glass-panel p-4 rounded-tr-2xl border-l-4 border-l-neon-lime pointer-events-auto min-w-[200px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-neon-lime">STATUS</span>
            <Zap className="w-3 h-3 text-neon-lime animate-pulse" />
          </div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GPS SIGNAL</span>
              <span className="text-white">STRONG</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ACCURACY</span>
              <span className="text-white">HIGH</span>
            </div>
          </div>
          <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-neon-lime w-[85%] animate-pulse"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <TooltipProvider>
            {/* Map Style Switcher */}
            <div className="relative">
              {isStyleMenuOpen && (
                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-40 glass-panel border border-neon-cyan/30 rounded-lg overflow-hidden flex flex-col shadow-[0_0_20px_rgba(0,255,255,0.2)] animate-in slide-in-from-bottom-2 fade-in duration-200">
                  <div className="px-3 py-2 bg-neon-cyan/10 border-b border-neon-cyan/20 text-xs font-bold text-neon-cyan font-mono text-center">
                    MAP LAYER
                  </div>
                  {[
                    { id: "dark", label: "DARK MODE" },
                    { id: "standard", label: "STANDARD" },
                    { id: "satellite", label: "SATELLITE" }
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => {
                        setMapStyle(style.id as any);
                        setIsStyleMenuOpen(false);
                      }}
                      className={`px-4 py-3 text-xs font-mono text-left transition-colors hover:bg-neon-cyan/20 flex items-center gap-2 ${
                        mapStyle === style.id ? "text-neon-cyan bg-neon-cyan/10" : "text-muted-foreground"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${mapStyle === style.id ? "bg-neon-cyan shadow-[0_0_5px_#00FFFF]" : "bg-white/20"}`}></div>
                      {style.label}
                    </button>
                  ))}
                </div>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`rounded-full w-12 h-12 border-neon-cyan/50 hover:bg-neon-cyan/20 hover:border-neon-cyan hover:text-neon-cyan transition-all duration-300 ${
                      isStyleMenuOpen ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.4)]" : "bg-black/50 text-neon-cyan/70"
                    }`}
                    onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
                  >
                    <Layers className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>地図モード切替</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-full w-12 h-12 border-neon-cyan/50 transition-all duration-300 ${
                    showTargetNames 
                      ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.4)]" 
                      : "bg-black/50 text-neon-cyan/70 hover:bg-neon-cyan/20 hover:border-neon-cyan hover:text-neon-cyan"
                  }`}
                  onClick={() => setShowTargetNames(!showTargetNames)}
                >
                  <Eye className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>ターゲット名表示切替</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12 bg-black/50 border-neon-pink/50 text-neon-pink/70 hover:bg-neon-pink/20 hover:border-neon-pink hover:text-neon-pink transition-all duration-300"
                  onClick={addLocation}
                >
                  <Plus className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>現在地をターゲットに追加</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12 bg-black/50 border-neon-cyan/50 text-neon-cyan/70 hover:bg-neon-cyan/20 hover:border-neon-cyan hover:text-neon-cyan transition-all duration-300"
                  onClick={() => {
                    // Force a small update to trigger re-render if needed, but mainly just set state
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        const pos = {
                          lat: position.coords.latitude,
                          lng: position.coords.longitude,
                        };
                        setCurrentLocation(pos);
                        toast.success("現在地へ移動しました");
                      },
                      () => {
                        // Fallback to last known location if GPS fails
                        setCurrentLocation({...currentLocation});
                        toast.info("現在地へ移動しました");
                      }
                    );
                  }}
                >
                  <Crosshair className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>現在地へ移動</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-full w-12 h-12 border-neon-lime/50 transition-all duration-300 ${
                    showHistory 
                      ? "bg-neon-lime/20 border-neon-lime text-neon-lime shadow-[0_0_10px_rgba(191,255,0,0.3)]" 
                      : "bg-black/50 text-neon-lime/70 hover:bg-neon-lime/20 hover:border-neon-lime hover:text-neon-lime"
                  }`}
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>移動履歴の表示切替</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            className={`rounded-full px-6 h-12 font-bold tracking-wider transition-all duration-300 shadow-lg ${
              isTracking 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 border border-red-400" 
                : "bg-neon-cyan hover:bg-cyan-400 text-black shadow-neon-cyan/20 border border-cyan-300"
            }`}
            onClick={toggleTracking}
          >
            {isTracking ? (
              <>STOP TRACKING</>
            ) : (
              <><Navigation className="w-4 h-4 mr-2" /> START TRACKING</>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
