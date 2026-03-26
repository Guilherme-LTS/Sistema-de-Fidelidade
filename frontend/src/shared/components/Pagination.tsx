// frontend/src/shared/components/Pagination.tsx
import React from 'react';
import { Button } from '../../components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  paginaAtual: number;
  totalPaginas: number;
  onPageChange: (page: number) => void;
}

function Pagination({ paginaAtual, totalPaginas, onPageChange }: PaginationProps) {
  if (totalPaginas <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(paginaAtual - 1)}
        disabled={paginaAtual === 1}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Anterior
      </Button>
      <div className="text-sm font-medium text-slate-600">
        Página {paginaAtual} de {totalPaginas}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(paginaAtual + 1)}
        disabled={paginaAtual === totalPaginas}
      >
        Próximo
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

export default Pagination;
