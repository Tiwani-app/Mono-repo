import {
  LibraryCategory,
  LibraryDocument,
  LibraryDocumentType,
} from "../types/library";

export const sortLibraryDocuments = (documents: LibraryDocument[]) =>
  [...documents].sort((a, b) => {
    const left = a.documentDate ?? a.uploadedAt;
    const right = b.documentDate ?? b.uploadedAt;
    return right.getTime() - left.getTime();
  });

export const filterLibraryDocumentsBySearch = (
  documents: LibraryDocument[],
  searchQuery: string,
) => {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    return documents;
  }
  return documents.filter(
    (document) =>
      document.title.toLowerCase().includes(query) ||
      document.description.toLowerCase().includes(query),
  );
};

export const filterLibraryDocumentsByCategory = (
  documents: LibraryDocument[],
  category: LibraryCategory,
) => documents.filter((document) => document.category === category);

export const filterLibraryDocumentsByTypeAndYear = (
  documents: LibraryDocument[],
  selectedType: LibraryDocumentType | "all",
  selectedYear: string,
) =>
  documents.filter((document) => {
    const date = document.documentDate ?? document.uploadedAt;
    const typeMatch = selectedType === "all" || document.type === selectedType;
    const yearMatch =
      selectedYear === "all" || String(date.getFullYear()) === selectedYear;
    return typeMatch && yearMatch;
  });
