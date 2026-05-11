import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { ShoppingCart, Package, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  const { user } = useAuth();
  
  const firstName = user?.nome?.split(' ')[0] || 'Usuário';

  const shortcuts = [
    { name: "Caixa PDV", path: "/pdv", icon: ShoppingCart, desc: "Realizar uma venda" },
    { name: "Clientes", path: "/clientes", icon: Users, desc: "Gerenciar clientes" },
    { name: "Locações", path: "/locacoes", icon: Package, desc: "Ver locações ativas" },
    { name: "Agenda", path: "/agenda", icon: Calendar, desc: "Calendário de eventos" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Olá, {firstName}! 👋</h1>
        <p className="mt-2 text-muted-foreground">
          Bem-vindo ao sistema. Escolha uma das opções abaixo para começar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {shortcuts.map((s, idx) => (
          <Link key={idx} to={s.path}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border/60 hover:border-primary/50 group">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="bg-primary/10 p-3 rounded-xl text-primary group-hover:scale-110 transition-transform">
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">{s.name}</CardTitle>
                  <CardDescription>{s.desc}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
