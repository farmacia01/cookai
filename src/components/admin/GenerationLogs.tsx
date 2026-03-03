import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const GenerationLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-generation-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user names for the logs
      const userIds = [...new Set(data?.map(log => log.user_id).filter(Boolean))];
      
      let profiles: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        profiles = (profilesData || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name || "Sem nome";
          return acc;
        }, {} as Record<string, string>);
      }

      return (data || []).map(log => ({
        ...log,
        user_name: log.user_id ? profiles[log.user_id] || "Usuário removido" : "Anônimo",
      }));
    },
  });

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Logs de Geração</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Últimas 50 gerações de receitas</p>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Data/Hora</TableHead>
                <TableHead className="min-w-[120px]">Usuário</TableHead>
                <TableHead className="min-w-[100px] hidden sm:table-cell">Modo</TableHead>
                <TableHead className="min-w-[100px] hidden md:table-cell">Tokens Gastos</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum log encontrado
                </TableCell>
              </TableRow>
            ) : (
              logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm">
                    {log.user_name}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="capitalize text-xs">
                      {log.mode || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">
                    {log.tokens_used?.toLocaleString() || "0"}
                  </TableCell>
                  <TableCell>
                    {log.status === "success" ? (
                      <div className="flex items-center gap-1 text-green-600 text-xs sm:text-sm">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Sucesso</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-destructive text-xs sm:text-sm">
                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Falha</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
};

export default GenerationLogs;