// src/app/(components)/map/searchBar.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

// Định nghĩa interface cho lịch sử tìm kiếm
interface SearchHistoryItem {
  name: string;
  timestamp: number;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type?: string;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
  onSuggestionSelect: (name: string) => void; // Thêm prop để xử lý khi chọn gợi ý
  junctions: any[];
  searchHistory: SearchHistoryItem[];
  suggestions: SearchResult[];
  onSuggestionClick: (suggestion: SearchResult) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  onSuggestionSelect,
  junctions,
  searchHistory,
  suggestions = [],
  onSuggestionClick,
  placeholder = "Tìm kiếm vị trí...",
}) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchesQuery = (junctionName: string, query: string): boolean => {
    const queryWords = query.toLowerCase().split(/\s+/);
    const junctionNameLower = junctionName.toLowerCase();
    let junctionNameIndex = 0;

    for (const queryWord of queryWords) {
      const foundIndex = junctionNameLower.indexOf(
        queryWord,
        junctionNameIndex
      );
      if (foundIndex === -1) return false;
      junctionNameIndex = foundIndex + 1;
    }
    return true;
  };

  const filteredSuggestions = React.useMemo(() => {
    if (!query) return [];
    return junctions.reduce<string[]>((acc, junction) => {
      if (matchesQuery(junction.junctionName, query)) {
        acc.push(junction.junctionName);
      }
      return acc;
    }, []);
  }, [query, junctions]);

  useEffect(() => {
    setShowSuggestions(!!query && filteredSuggestions.length > 0);
  }, [filteredSuggestions, query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSuggestionClick = (suggestion: SearchResult) => {
    setQuery(suggestion.title);
    setShowSuggestions(false);
    onSuggestionClick(suggestion);
  };

  const clearSearch = () => {
    setQuery("");
    setShowSuggestions(false);
    onSearch("");
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!query && searchHistory.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200); // Delay để cho phép click vào gợi ý trước khi ẩn
  };

  const clearHistory = () => {
    localStorage.removeItem("searchHistory");
    window.dispatchEvent(new Event("storage")); // Trigger sự kiện để cập nhật state
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{suggestion.title}</div>
              {suggestion.subtitle && (
                <div className="text-sm text-gray-500">{suggestion.subtitle}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
