import React, { useState, useEffect } from "react";
import { Check, Store, MapPin, Link as LinkIcon, Upload, ImageIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "react-toastify";
import MapLocationPicker from "../../components/MapLocationPicker";
import api from "../../services/api";
import { supabase } from "../../services/supabase";

const PerfilRestauranteTab = () => {
  const [perfil, setPerfil] = useState({
    name: '', document: '', logo_url: '',
    whatsapp: '', instagram: '', facebook: '', tiktok: '',
    address_street: '', address_number: '', address_neighborhood: '', 
    address_city: '', address_state: '', address_zip: '', 
    latitude: null, longitude: null
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/profile');
      setPerfil(prev => ({ ...prev, ...res.data }));
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      toast.error(error.message || 'Erro ao carregar perfil do restaurante.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/admin/profile', perfil);
      toast.success('Perfil atualizado com sucesso!');
      await carregarPerfil();
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      toast.error(error.message || 'Erro de conexão ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleLocationChange = (data: any) => {
    setPerfil(prev => ({
      ...prev,
      address_street: data.street || prev.address_street,
      address_number: data.number || prev.address_number,
      address_neighborhood: data.neighborhood || prev.address_neighborhood,
      address_city: data.city || prev.address_city,
      address_state: data.state || prev.address_state,
      address_zip: data.zip || prev.address_zip,
      latitude: data.latitude,
      longitude: data.longitude
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        toast.warning('A imagem deve ter no máximo 2MB.');
        return;
      }

      setUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `tenant_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-logos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('tenant-logos').getPublicUrl(filePath);
      
      setPerfil(prev => ({ ...prev, logo_url: data.publicUrl }));
      toast.success('Logo enviada com sucesso! Não esqueça de Salvar o Perfil.');
    } catch (error: any) {
      console.error('Erro ao fazer upload da logo:', error);
      toast.error('Erro ao fazer upload da logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSalvar} className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Store className="h-5 w-5 text-indigo-600" /> Dados Básicos
          </CardTitle>
          <CardDescription>
            Informações públicas sobre o seu estabelecimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 flex items-center gap-6 pb-4 border-b border-slate-100">
            <div className="h-24 w-24 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
              {perfil.logo_url ? (
                <img src={perfil.logo_url} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-800 mb-1">Logo do Restaurante</h3>
              <p className="text-xs text-slate-500 mb-3">Recomendado: 512x512px, formato PNG ou JPG. Máximo 2MB.</p>
              <label className="cursor-pointer">
                <div className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingLogo ? 'Enviando...' : <><Upload className="h-4 w-4 mr-2" /> Escolher Imagem</>}
                </div>
                <input type="file" className="hidden" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nome do Restaurante *</label>
            <input 
              type="text" 
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={perfil.name || ''} 
              onChange={(e) => setPerfil({...perfil, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Documento (CNPJ/CPF)</label>
            <input 
              type="text" 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={perfil.document || ''} 
              onChange={(e) => setPerfil({...perfil, document: e.target.value})}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-indigo-600" /> Redes Sociais e Contato
          </CardTitle>
          <CardDescription>
            Links para os clientes te encontrarem nas redes.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">WhatsApp</label>
            <input 
              type="text" placeholder="(11) 99999-9999"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={perfil.whatsapp || ''} 
              onChange={(e) => setPerfil({...perfil, whatsapp: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Instagram (URL)</label>
            <input 
              type="text" placeholder="https://instagram.com/..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={perfil.instagram || ''} 
              onChange={(e) => setPerfil({...perfil, instagram: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Facebook (URL)</label>
            <input 
              type="text" placeholder="https://facebook.com/..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={perfil.facebook || ''} 
              onChange={(e) => setPerfil({...perfil, facebook: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">TikTok (URL)</label>
            <input 
              type="text" placeholder="https://tiktok.com/@..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={perfil.tiktok || ''} 
              onChange={(e) => setPerfil({...perfil, tiktok: e.target.value})}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" /> Localização
          </CardTitle>
          <CardDescription>
            Pesquise no mapa ou arraste o pino para autopreencher os campos de endereço.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <MapLocationPicker initialData={perfil} onLocationChange={handleLocationChange} />
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Rua</label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={perfil.address_street || ''} 
                onChange={(e) => setPerfil({...perfil, address_street: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Número</label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={perfil.address_number || ''} 
                onChange={(e) => setPerfil({...perfil, address_number: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Bairro</label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={perfil.address_neighborhood || ''} 
                onChange={(e) => setPerfil({...perfil, address_neighborhood: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Cidade</label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={perfil.address_city || ''} 
                onChange={(e) => setPerfil({...perfil, address_city: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Estado</label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={perfil.address_state || ''} 
                onChange={(e) => setPerfil({...perfil, address_state: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">CEP</label>
              <input 
                type="text" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={perfil.address_zip || ''} 
                onChange={(e) => setPerfil({...perfil, address_zip: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 py-4 flex justify-end">
          <Button
            type="submit"
            disabled={loading || saving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? (
              <span className="flex items-center gap-2">Salvando...</span>
            ) : (
              <span className="flex items-center gap-2"><Check className="h-4 w-4" /> Salvar Perfil</span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default PerfilRestauranteTab;
