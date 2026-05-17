import { Link } from "wouter";
import { useListLevels } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BookOpen, GraduationCap, School, Trophy, Building2 } from "lucide-react";

const CYCLE_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; order: number }> = {
  "Primaire": { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: BookOpen, order: 1 },
  "Collège": { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: School, order: 2 },
  "Lycée": { color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", icon: GraduationCap, order: 3 },
  "Supérieur": { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: Building2, order: 4 },
  "Concours": { color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", icon: Trophy, order: 5 },
};

const DEFAULT_CONFIG = { color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", icon: BookOpen, order: 99 };

export default function Levels() {
  const { data: levels, isLoading } = useListLevels();

  const groups = (levels ?? []).reduce<Record<string, typeof levels>>((acc, lv) => {
    const g = lv.group ?? "Autres";
    if (!acc[g]) acc[g] = [];
    acc[g]!.push(lv);
    return acc;
  }, {});

  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    const oa = CYCLE_CONFIG[a]?.order ?? 99;
    const ob = CYCLE_CONFIG[b]?.order ?? 99;
    return oa - ob;
  });

  const totalDocs = (levels ?? []).reduce((s, l) => s + l.documentCount, 0);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>
            Niveaux scolaires
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Retrouvez tous vos documents par cycle et niveau — du primaire aux grandes écoles et concours nationaux.
          </p>
          <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
            <span><strong className="text-foreground">{levels?.length ?? 0}</strong> niveaux disponibles</span>
            <span><strong className="text-foreground">{totalDocs}</strong> documents au total</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {isLoading ? (
          <div className="space-y-10">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-8 w-40 mb-5" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-28 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sortedGroups.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="font-semibold text-lg mb-1">Aucun niveau configuré</h3>
            <p className="text-muted-foreground text-sm">L'administrateur doit d'abord ajouter des niveaux.</p>
          </div>
        ) : (
          sortedGroups.map(([groupName, groupLevels]) => {
            const cfg = CYCLE_CONFIG[groupName] ?? DEFAULT_CONFIG;
            const CycleIcon = cfg.icon;
            return (
              <section key={groupName}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-9 h-9 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
                    <CycleIcon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold leading-none">{groupName}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {groupLevels!.length} niveau{groupLevels!.length > 1 ? "x" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {groupLevels!.map((level) => (
                    <Link key={level.id} href={`/catalog?level=${level.slug}`}>
                      <div className={`group relative bg-white border ${cfg.border} rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all duration-200 cursor-pointer h-full flex flex-col justify-between`}>
                        <div>
                          <div className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} mb-2`}>
                            {groupName}
                          </div>
                          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">
                            {level.name}
                          </h3>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {level.documentCount} doc{level.documentCount !== 1 ? "s" : ""}
                          </span>
                          <ArrowRight className={`w-3.5 h-3.5 ${cfg.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
