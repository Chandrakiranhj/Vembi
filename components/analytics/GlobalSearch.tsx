"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Loader2, Box, Layers, ShoppingBag, RotateCcw, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";

interface SearchResult {
    id: string;
    type: 'batch' | 'component' | 'product' | 'return' | 'assembly';
    label: string;
    subLabel: string;
}

interface GlobalSearchProps {
    onSelect: (result: SearchResult) => void;
}

export function GlobalSearch({ onSelect }: GlobalSearchProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [debouncedQuery, setDebouncedQuery] = React.useState("");

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const { data: results, isLoading } = useQuery({
        queryKey: ['analytics-search', debouncedQuery],
        queryFn: async () => {
            if (debouncedQuery.length < 2) return [];
            const res = await fetch(`/api/analytics/search?q=${encodeURIComponent(debouncedQuery)}`);
            if (!res.ok) throw new Error('Search failed');
            return res.json() as Promise<SearchResult[]>;
        },
        enabled: debouncedQuery.length >= 2
    });

    const handleSelect = (result: SearchResult) => {
        onSelect(result);
        setOpen(false);
        setQuery("");
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[400px] justify-between text-muted-foreground"
                >
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        {query || "Search assemblies, batches, components..."}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Type to search..."
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {isLoading && (
                            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                            </div>
                        )}
                        {!isLoading && results?.length === 0 && debouncedQuery.length >= 2 && (
                            <CommandEmpty>No results found.</CommandEmpty>
                        )}
                        {!isLoading && debouncedQuery.length < 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search
                            </div>
                        )}

                        {results && results.length > 0 && (
                            <>
                                <CommandGroup heading="Assemblies">
                                    {results.filter(r => r.type === 'assembly').map((result) => (
                                        <CommandItem key={result.id} value={result.id} onSelect={() => handleSelect(result)}>
                                            <Wrench className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col">
                                                <span>{result.label}</span>
                                                <span className="text-xs text-muted-foreground">{result.subLabel}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <CommandGroup heading="Batches">
                                    {results.filter(r => r.type === 'batch').map((result) => (
                                        <CommandItem key={result.id} value={result.id} onSelect={() => handleSelect(result)}>
                                            <Box className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col">
                                                <span>{result.label}</span>
                                                <span className="text-xs text-muted-foreground">{result.subLabel}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <CommandGroup heading="Components">
                                    {results.filter(r => r.type === 'component').map((result) => (
                                        <CommandItem key={result.id} value={result.id} onSelect={() => handleSelect(result)}>
                                            <Layers className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col">
                                                <span>{result.label}</span>
                                                <span className="text-xs text-muted-foreground">{result.subLabel}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <CommandGroup heading="Products">
                                    {results.filter(r => r.type === 'product').map((result) => (
                                        <CommandItem key={result.id} value={result.id} onSelect={() => handleSelect(result)}>
                                            <ShoppingBag className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col">
                                                <span>{result.label}</span>
                                                <span className="text-xs text-muted-foreground">{result.subLabel}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <CommandGroup heading="Returns">
                                    {results.filter(r => r.type === 'return').map((result) => (
                                        <CommandItem key={result.id} value={result.id} onSelect={() => handleSelect(result)}>
                                            <RotateCcw className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <div className="flex flex-col">
                                                <span>{result.label}</span>
                                                <span className="text-xs text-muted-foreground">{result.subLabel}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
