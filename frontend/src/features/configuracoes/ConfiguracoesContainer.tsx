import React, { useEffect, useState } from "react";
import { Settings, Store, User, ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PerfilUsuarioTab from "./PerfilUsuarioTab";
import PerfilRestauranteTab from "./PerfilRestauranteTab";
import RegrasFidelidadeTab from "./RegrasFidelidadeTab";

type TabType = "perfil_restaurante" | "perfil_usuario" | "regras";

const ConfiguracoesContainer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("perfil_restaurante");

  useEffect(() => {
    const tab = searchParams.get("tab") as TabType;
    if (tab && ["perfil_restaurante", "perfil_usuario", "regras"].includes(tab)) {
      setActiveTab(tab);
    } else {
      setSearchParams({ tab: "perfil_restaurante" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="h-8 w-8 text-indigo-600" />
          Configurações
        </h2>
        <p className="text-slate-500 mt-1">
          Gerencie seu perfil, dados do restaurante e regras de negócio.
        </p>
      </div>

      <div className="flex space-x-1 rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => handleTabChange("perfil_restaurante")}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2 ${
            activeTab === "perfil_restaurante"
              ? "bg-white text-indigo-700 shadow"
              : "text-slate-600 hover:bg-white/[0.12] hover:text-indigo-600"
          }`}
        >
          <Store className="w-4 h-4" /> Restaurante
        </button>
        <button
          onClick={() => handleTabChange("perfil_usuario")}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2 ${
            activeTab === "perfil_usuario"
              ? "bg-white text-indigo-700 shadow"
              : "text-slate-600 hover:bg-white/[0.12] hover:text-indigo-600"
          }`}
        >
          <User className="w-4 h-4" /> Meu Perfil
        </button>
        <button
          onClick={() => handleTabChange("regras")}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-indigo-400 focus:outline-none focus:ring-2 ${
            activeTab === "regras"
              ? "bg-white text-indigo-700 shadow"
              : "text-slate-600 hover:bg-white/[0.12] hover:text-indigo-600"
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Regras de Fidelidade
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "perfil_restaurante" && <PerfilRestauranteTab />}
        {activeTab === "perfil_usuario" && <PerfilUsuarioTab />}
        {activeTab === "regras" && <RegrasFidelidadeTab />}
      </div>
    </div>
  );
};

export default ConfiguracoesContainer;
