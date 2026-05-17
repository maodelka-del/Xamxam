import { useState } from "react";
import { useSearch } from "wouter";
import { Search, SlidersHorizontal, X, Sparkles } from "lucide-react";
import { useListDocuments, useListCategories, useListLevels } from "@workspace/api-client-react";
import { DocumentCard, getCategoryStyle } from "@/components/DocumentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Catalog() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);

  const [search, setSearch] = useState("");
  const [level, setLevel] = useState(params.get("level") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [page, setPage] = useState(1);

  const queryParams = {
    search: search || undefined,
    level: level || undefined,
    category: category || undefined,
    page,
    limit: 16,
  };

  const { data, isLoading } = useListDocuments(queryParams);
  const { data: categories } = useListCategories();
  const { data: levels } = useListLevels();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const levelGroups = (levels ?? []).reduce<Record<string, typeof levels>>((acc, lv) => {
    const g = lv.group ?? "Autres";
    if (!acc[g]) acc[g] = [];
    acc[g]!.push(lv);
    return acc;
  }, {});
  const hasGroups = Object.keys(levelGroups).length > 0;
  const allInOneGroup = Object.keys(levelGroups).length === 1 && Object.keys(levelGroups)[0] === "Autres";

  const hasFilters = !!(search || level || category);
  const activeCategory = categories?.find((c) => c.slug === category);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3 h-3" />
            {data?.total ?? "..."} produits numériques disponibles
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 leading-tight" style={{ fontFamily: "var(--app-font-serif)" }}>
            Trouvez votre prochain<br className="hidden sm:block" /> produit numérique
          </h1>
          <p className="text-white/75 mb-8 text-sm sm:text-base max-w-xl mx-auto">
            Documents éducatifs, ebooks, templates, musique — tout ce dont vous avez besoin en un seul endroit.
          </p>

          {/* Search bar */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={search}
              onChange={handleSearch}
              className="pl-12 h-12 text-base rounded-xl bg-white text-foreground border-0 shadow-lg focus-visible:ring-2 focus-visible:ring-white/50"
              data-testid="input-search"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setPage(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category chips */}
      {categories && categories.length > 0 && (
        <div className="bg-white border-b border-border sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => { setCategory(""); setPage(1); }}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 ${
                !category
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              Tous
            </button>
            {categories.map((cat) => {
              const style = getCategoryStyle(cat.name);
              const Icon = style.icon as React.ElementType;
              const isActive = category === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(isActive ? "" : cat.slug); setPage(1); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r ${style.gradient} text-white shadow-sm`
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center mb-6">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {activeCategory && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryStyle(activeCategory.name).light} flex items-center gap-1`}>
                {activeCategory.name}
                <button onClick={() => { setCategory(""); setPage(1); }}>
                  <X className="w-3 h-3 ml-0.5" />
                </button>
              </span>
            )}
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Chargement..." : `${data?.total ?? 0} produit${(data?.total ?? 0) !== 1 ? "s" : ""}`}
              {hasFilters ? " trouvés" : " disponibles"}
            </p>
          </div>

          <div className="flex gap-2">
            <Select value={level || "all"} onValueChange={(v) => { setLevel(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-level">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                {hasGroups && !allInOneGroup
                  ? Object.entries(levelGroups).map(([groupName, groupLevels]) => (
                      <SelectGroup key={groupName}>
                        <SelectLabel>{groupName}</SelectLabel>
                        {groupLevels!.map((l) => (
                          <SelectItem key={l.id} value={l.slug}>{l.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  : (levels ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.slug}>{l.name}</SelectItem>
                    ))}
              </SelectContent>
            </Select>

            <Select value={category || "all"} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }} data-testid="select-category">
              <SelectTrigger className="w-44 h-9 text-sm">
                <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => { setSearch(""); setLevel(""); setCategory(""); setPage(1); }}
              >
                <X className="w-3.5 h-3.5 mr-1" /> Effacer
              </Button>
            )}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : data?.documents.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="font-bold text-xl mb-2">Aucun produit trouvé</h3>
            <p className="text-muted-foreground text-sm mb-6">Essayez de modifier vos filtres de recherche</p>
            <Button variant="outline" onClick={() => { setSearch(""); setLevel(""); setCategory(""); setPage(1); }}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {data?.documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>

            {/* Pagination */}
            {(data?.totalPages ?? 1) > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  data-testid="button-prev-page"
                >
                  ← Précédent
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground font-medium">
                  Page {page} / {data?.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === (data?.totalPages ?? 1)}
                  onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  data-testid="button-next-page"
                >
                  Suivant →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
