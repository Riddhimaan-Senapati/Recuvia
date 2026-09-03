"use client";

import { useRef, useState, ChangeEvent, KeyboardEvent } from "react";
import { toast } from "sonner";

export interface ItemImage {
  image_url: string;
}

export interface Profile {
  email: string;
}

export interface Item {
  id: string;
  title: string;
  description?: string;
  location: string;
  created_at?: string;
  profiles?: Profile;
  item_images: ItemImage[];
  score?: number;
}

type SearchProgress = "idle" | "searching" | "complete" | "error";

export function useSearch(
  activeTab: string,
  setActiveTab: (tab: string) => void,
) {
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [maxResults, setMaxResults] = useState("20");
  const [customMaxResults, setCustomMaxResults] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchImage, setSearchImage] = useState<File | null>(null);
  const [searchImagePreview, setSearchImagePreview] = useState<string | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchProgress, setSearchProgress] = useState<SearchProgress>("idle");
  const [searchStatusMessage, setSearchStatusMessage] = useState("");
  const [showWarning, setShowWarning] = useState(true);
  const searchFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSearchImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setSearchImage(file);
    setSearchImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveSearchImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSearchImage(null);
    setSearchImagePreview(null);
    if (searchFileInputRef.current) {
      searchFileInputRef.current.value = "";
    }
  };

  const handleTextSearch = async () => {
    if (!searchQuery.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setSearchProgress("searching");
    setSearchStatusMessage("Searching for items...");
    try {
      let maxResultsNum: number | undefined = undefined;
      if (maxResults === "custom") {
        if (
          !customMaxResults ||
          isNaN(Number(customMaxResults)) ||
          Number(customMaxResults) < 1
        ) {
          toast.error(
            "Please enter a valid positive number for custom max results.",
          );
          setLoading(false);
          return;
        }
        maxResultsNum = Number(customMaxResults);
      } else if (maxResults !== "all") {
        maxResultsNum = Number(maxResults);
      }
      const response = await fetch("/api/search/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          threshold: similarityThreshold,
          maxResults: maxResultsNum,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed");
      setItems(data.items || []);
      setSearchProgress("complete");
      setSearchStatusMessage(`Found ${data.items?.length || 0} items`);
    } catch (error) {
      console.error("Error searching:", error);
      setItems([]);
      setSearchProgress("error");
      setSearchStatusMessage(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSearch = async () => {
    if (!searchImage) return;
    setSearchLoading(true);
    setLoading(true);
    setSearchProgress("searching");
    setSearchStatusMessage("Processing image search...");
    try {
      if (maxResults === "custom") {
        if (
          !customMaxResults ||
          isNaN(Number(customMaxResults)) ||
          Number(customMaxResults) < 1
        ) {
          toast.error(
            "Please enter a valid positive number for custom max results.",
          );
          setSearchLoading(false);
          setLoading(false);
          return;
        }
      }
      const formData = new FormData();
      formData.append("image", searchImage);
      formData.append("threshold", String(similarityThreshold));
      formData.append(
        "maxResults",
        maxResults === "custom" ? customMaxResults : maxResults,
      );
      const response = await fetch("/api/search/image", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed");
      setItems(data.items || []);
      setSearchProgress("complete");
      setSearchStatusMessage(`Found ${data.items?.length || 0} items`);
    } catch (error) {
      console.error("Error searching by image:", error);
      setItems([]);
      setSearchProgress("error");
      setSearchStatusMessage(`Error: ${(error as Error).message}`);
    } finally {
      setSearchLoading(false);
      setLoading(false);
    }
  };

  const handleSearchWithItem = async (imageUrl: string, title: string) => {
    setLoading(true);
    setSearchProgress("searching");
    setSearchStatusMessage(`Finding items similar to "${title}"...`);
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      const imageBlob = await imageResponse.blob();
      const fileName = `search-${Date.now()}.jpg`;
      const file = new File([imageBlob], fileName, { type: "image/jpeg" });
      setSearchImage(file);
      setSearchImagePreview(imageUrl);
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/search/image", {
        method: "POST",
        body: formData,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Search API error: ${response.status} - ${text}`);
      }
      if (!text) {
        setItems([]);
        setSearchProgress("error");
        setSearchStatusMessage("Error: Empty response from server");
        return;
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Failed to parse response as JSON: ${text}`);
      }
      setItems(data.items || []);
      setSearchProgress("complete");
      setSearchStatusMessage(`Found ${data.items?.length || 0} similar items`);
      if (activeTab !== "lost") {
        setActiveTab("lost");
      }
    } catch (error) {
      console.error("Error searching by existing image:", error);
      toast.error(
        `Error searching with this image: ${(error as Error).message}`,
      );
      setItems([]);
      setSearchProgress("error");
      setSearchStatusMessage(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }
    setDeleting(true);
    try {
      const url = item.item_images[0].image_url;
      const fileName = url.split("/").pop();
      const response = await fetch("/api/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: item.id,
          fileName: fileName,
        }),
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete item");
      }
      setItems(items.filter((i) => i.id !== item.id));
      toast.success("Item deleted successfully!");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Error deleting item: " + (error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTextSearch();
    }
  };

  return {
    similarityThreshold,
    setSimilarityThreshold,
    maxResults,
    setMaxResults,
    customMaxResults,
    setCustomMaxResults,
    items,
    loading,
    searchQuery,
    setSearchQuery,
    searchImage,
    searchImagePreview,
    searchLoading,
    deleting,
    searchProgress,
    searchStatusMessage,
    showWarning,
    setShowWarning,
    searchFileInputRef,
    handleSearchImageChange,
    handleRemoveSearchImage,
    handleTextSearch,
    handleImageSearch,
    handleSearchWithItem,
    handleDeleteItem,
    handleKeyPress,
  };
}
