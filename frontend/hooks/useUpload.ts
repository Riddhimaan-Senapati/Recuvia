"use client";

import { useRef, useState, ChangeEvent, FormEvent } from "react";
import { toast } from "sonner";

type UploadStatus = "idle" | "uploading" | "complete" | "error";

export function useUpload() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imageFile) {
      toast.error("Please select an image");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!location.trim()) {
      toast.error("Please enter a location");
      return;
    }
    setUploadStatus("uploading");
    setStatusMessage("Uploading your found item...");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description || "");
      formData.append("location", location);
      formData.append("image", imageFile);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const text = await response.text();
      let result;
      if (text && text.trim()) {
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error(
            `Invalid response format: ${text.substring(0, 100)}...`,
          );
        }
      } else {
        throw new Error(
          `Server returned empty response with status: ${response.status}`,
        );
      }
      if (!response.ok) {
        throw new Error(
          result?.error || `Upload failed with status: ${response.status}`,
        );
      }
      setUploadStatus("complete");
      setStatusMessage("Item uploaded successfully!");
      setTitle("");
      setDescription("");
      setLocation("");
      setImageFile(null);
      setImagePreview(null);
      setTimeout(() => {
        setUploadStatus("idle");
        setStatusMessage("");
      }, 5000);
    } catch (error) {
      console.error("Error uploading item:", error);
      setUploadStatus("error");
      setStatusMessage(`Error: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return {
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
  };
}
