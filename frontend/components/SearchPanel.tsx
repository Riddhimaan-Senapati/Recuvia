"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ImageIcon,
  SearchIcon,
  Search,
  Trash2,
  Clock,
  CheckCircle,
} from "lucide-react";
import Image from "next/image";
import { useSearch } from "@/hooks/useSearch";

type SearchState = ReturnType<typeof useSearch>;

export function SearchPanel(props: SearchState) {
  const {
    similarityThreshold,
    setSimilarityThreshold,
    maxResults,
    setMaxResults,
    customMaxResults,
    setCustomMaxResults,
    searchQuery,
    setSearchQuery,
    searchImage,
    searchImagePreview,
    searchLoading,
    searchProgress,
    searchStatusMessage,
    searchFileInputRef,
    handleSearchImageChange,
    handleRemoveSearchImage,
    handleTextSearch,
    handleImageSearch,
    handleKeyPress,
    showWarning,
    setShowWarning,
  } = props;

  return (
    <>
      {showWarning && (
        <div className="mb-2 p-2 rounded bg-yellow-100 text-yellow-800 border border-yellow-300 text-sm flex items-center justify-between">
          <span>
            <strong>Note:</strong> For text search, lower similarity thresholds
            (e.g., 0.1–0.3) are usually required to get relevant results. For
            image search, higher values may work better.
          </span>
          <button
            className="ml-4 px-2 py-0.5 rounded bg-yellow-200 hover:bg-yellow-300 text-yellow-900 text-xs"
            onClick={() => setShowWarning(false)}
          >
            Hide
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 w-full md:w-auto relative group">
          <label
            htmlFor="threshold-slider"
            className="font-medium text-sm flex items-center"
          >
            Similarity Threshold
            <span className="ml-1 cursor-pointer text-gray-400" tabIndex={0}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <text
                  x="12"
                  y="16"
                  textAnchor="middle"
                  fontSize="12"
                  fill="currentColor"
                >
                  ?
                </text>
              </svg>
              <span className="absolute left-0 top-8 z-10 hidden group-hover:block group-focus:block bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg w-56">
                Controls how similar a match must be to your search. Lower
                values return more (but less similar) results. Higher values
                return fewer, but more similar, results.
              </span>
            </span>
          </label>
          <input
            id="threshold-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={similarityThreshold}
            onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
            className="w-32 mx-2"
          />
          <span className="text-sm w-10 text-center">
            {similarityThreshold}
          </span>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto relative group">
          <label
            htmlFor="max-results-select"
            className="font-medium text-sm flex items-center"
          >
            Max Results
            <span className="ml-1 cursor-pointer text-gray-400" tabIndex={0}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <text
                  x="12"
                  y="16"
                  textAnchor="middle"
                  fontSize="12"
                  fill="currentColor"
                >
                  ?
                </text>
              </svg>
              <span className="absolute left-0 top-8 z-10 hidden group-hover:block group-focus:block bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg w-56">
                Limits the number of items shown in the results. Choose "All" to
                show every match found (may be slow for large numbers). Select
                "Custom" to enter your own value.
              </span>
            </span>
          </label>
          <select
            id="max-results-select"
            value={maxResults}
            onChange={(e) => setMaxResults(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="all">All</option>
            <option value="custom">Custom…</option>
          </select>
          {maxResults === "custom" && (
            <input
              type="number"
              min={1}
              value={customMaxResults}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setCustomMaxResults(val);
              }}
              placeholder="Enter number"
              className="ml-2 border rounded px-2 py-1 text-sm w-24"
            />
          )}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search for your lost items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button
            onClick={handleTextSearch}
            className="bg-lost text-lost-foreground hover:bg-lost/90"
            disabled={searchProgress === "searching"}
          >
            {searchProgress === "searching" ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <SearchIcon className="mr-2 h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <div
            className="border rounded-md flex-1 flex items-center px-3 cursor-pointer"
            onClick={() => searchFileInputRef.current?.click()}
          >
            {searchImagePreview ? (
              <>
                <div className="relative h-10 w-10 mr-2">
                  <Image
                    src={searchImagePreview}
                    alt="Search"
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <span className="text-gray-500 mr-2">Image selected</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 p-1 h-auto"
                  aria-label="Remove image"
                  onClick={handleRemoveSearchImage}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Upload image to search</span>
              </>
            )}
            <input
              type="file"
              ref={searchFileInputRef}
              onChange={handleSearchImageChange}
              accept="image/*"
              className="hidden"
              aria-label="Select image for search"
            />
          </div>
          <Button
            onClick={handleImageSearch}
            disabled={!searchImage || searchLoading}
            className="bg-lost text-lost-foreground hover:bg-lost/90"
          >
            {searchLoading ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Find Similar
              </>
            )}
          </Button>
        </div>
      </div>

      {searchProgress !== "idle" && (
        <div
          className={`mb-4 p-3 rounded-md ${
            searchProgress === "error"
              ? "bg-red-50 text-red-700 border border-red-200"
              : searchProgress === "complete"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}
        >
          <div className="flex items-center">
            {searchProgress === "error" && (
              <div className="mr-2 text-red-500">⚠️</div>
            )}
            {searchProgress === "complete" && (
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            )}
            {searchProgress === "searching" && (
              <Clock className="mr-2 h-5 w-5 text-blue-500 animate-pulse" />
            )}
            <p className="font-medium">{searchStatusMessage}</p>
          </div>
        </div>
      )}
    </>
  );
}
