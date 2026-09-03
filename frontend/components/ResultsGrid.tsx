"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Search } from "lucide-react";
import Image from "next/image";
import { useSearch } from "@/hooks/useSearch";

type SearchState = ReturnType<typeof useSearch>;

interface ResultsGridProps {
  search: SearchState;
  user: { email: string | null };
}

export function ResultsGrid({ search, user }: ResultsGridProps) {
  const {
    items,
    loading,
    searchQuery,
    searchImagePreview,
    deleting,
    handleSearchWithItem,
    handleDeleteItem,
  } = search;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {loading ? (
        <p className="col-span-3 text-center py-8">Searching for items...</p>
      ) : items.length > 0 ? (
        items.map((item) => (
          <Card key={item.id} className="p-4 flex flex-col h-full">
            {item.item_images && item.item_images[0] && (
              <div className="relative h-48 w-full mb-3 group">
                <Image
                  src={item.item_images[0].image_url}
                  alt={item.title}
                  fill
                  className="object-cover rounded"
                />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded flex flex-col justify-between p-2 text-white">
                  <div className="text-sm font-semibold bg-black/60 self-start px-2 py-1 rounded">
                    Score: {item.score ? item.score.toFixed(4) : "N/A"}
                  </div>

                  <Button
                    onClick={() =>
                      handleSearchWithItem(
                        item.item_images[0].image_url,
                        item.title,
                      )
                    }
                    className="self-end bg-lost text-lost-foreground hover:bg-lost/90"
                    size="sm"
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Search Similar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{item.title}</h3>

              {(user.email === item.profiles?.email ||
                user.email === "riddhimaan22@gmail.com") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 h-auto"
                  onClick={() => handleDeleteItem(item)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Location: {item.location || "Unknown"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Reported by: {item.profiles?.email || "Unknown user"}
            </p>
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                {item.description}
              </p>
            )}
          </Card>
        ))
      ) : (
        <p className="col-span-3 text-center py-8 text-gray-500 dark:text-gray-400">
          {searchQuery || searchImagePreview
            ? "No matching items found. Try a different search."
            : "Search for lost items using text or image above."}
        </p>
      )}
    </div>
  );
}
