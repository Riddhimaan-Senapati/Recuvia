"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Upload, Clock, CheckCircle } from "lucide-react";
import Image from "next/image";
import { useUpload } from "@/hooks/useUpload";

export function UploadForm() {
  const {
    title,
    setTitle,
    description,
    setDescription,
    location,
    setLocation,
    imageFile,
    setImageFile,
    imagePreview,
    setImagePreview,
    uploading,
    uploadStatus,
    statusMessage,
    fileInputRef,
    handleImageChange,
    handleSubmit,
  } = useUpload();

  return (
    <div className="mb-8">
      <Card className="p-6 border-found/20">
        <h2 className="text-xl font-semibold mb-4 text-found">
          Upload a Found Item
        </h2>
        <p className="text-muted-foreground mb-4">
          Found something that might belong to someone else? Upload it here to
          help it find its way back home.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Item name or brief description"
            />
          </div>

          <div>
            <label className="block mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide more details about the item"
            />
          </div>

          <div>
            <label className="block mb-1">Location *</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="Where was this item found?"
            />
          </div>

          <div>
            <label className="block mb-1">Image *</label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative h-48 w-full">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                  <div className="absolute bottom-2 right-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="bg-white/80 hover:bg-white text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Click to upload an image (required)
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Upload a clear photo to help others identify their lost item
                  </p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
                aria-label="Upload image"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={uploading || !imageFile || !title || !location}
            className="w-full bg-found text-found-foreground hover:bg-found/90"
          >
            {uploading ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Found Item"
            )}
          </Button>

          {uploadStatus !== "idle" && (
            <div
              className={`mt-4 rounded-2xl shadow-lg border transition-all duration-200 ${
                uploadStatus === "error"
                  ? "bg-red-50/90 border-red-200 text-red-700"
                  : uploadStatus === "complete"
                    ? "bg-green-50/90 border-green-200 text-green-700"
                    : "bg-blue-50/90 border-blue-200 text-blue-700"
              }`}
              style={{
                minWidth: 320,
                maxWidth: 480,
                margin: "0 auto",
                padding: "1.5rem",
              }}
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-center gap-3 mb-2">
                {uploadStatus === "error" && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-100 p-2">
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </span>
                )}
                {uploadStatus === "complete" && (
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 p-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </span>
                )}
                {uploadStatus === "uploading" && (
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-2">
                    <Clock className="h-5 w-5 text-blue-500 animate-spin" />
                  </span>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-base">
                    {uploadStatus === "error"
                      ? "Upload Error"
                      : uploadStatus === "complete"
                        ? "Upload Successful!"
                        : "Uploading..."}
                  </p>
                  <p className="text-sm opacity-80">{statusMessage}</p>
                </div>
              </div>
              {uploadStatus === "complete" && (
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Your item has been successfully uploaded and is now
                    searchable.
                  </p>
                </div>
              )}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
