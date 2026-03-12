import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <Construction className="w-16 h-16 text-primary mb-4" />
      <h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md">
        Este módulo está em desenvolvimento e será habilitado em breve. 
        Os módulos <strong>Dashboard</strong> e <strong>Gestão de Casos</strong> já estão totalmente funcionais.
      </p>
    </div>
  );
}
