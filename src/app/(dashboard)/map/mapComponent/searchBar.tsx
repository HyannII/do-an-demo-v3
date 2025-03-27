// src/app/(components)/map/searchBar.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";

// Định nghĩa interface cho lịch sử tìm kiếm
interface SearchHistoryItem {
  name: string;
  timestamp: number;
}

interface SearchBarProps {
  onSearch: (name: string) => void;
  onClear: () => void;
  onSuggestionSelect: (name: string) => void; // Thêm prop để xử lý khi chọn gợi ý
  junctions: any[];
  searchHistory: SearchHistoryItem[];
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  onSuggestionSelect,
  junctions,
  searchHistory,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
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
    setSuggestions(filteredSuggestions);
    setShowSuggestions(!!query && filteredSuggestions.length > 0);
  }, [filteredSuggestions, query]);

  const handleClear = () => {
    setQuery("");
    setShowSuggestions(false);
    onClear();
  };

  const clearHistory = () => {
    localStorage.removeItem("searchHistory");
    window.dispatchEvent(new Event("storage")); // Trigger sự kiện để cập nhật state
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSuggestionSelect(suggestion); // Gọi hàm onSuggestionSelect để lưu vào lịch sử
  };

  const handleHistoryClick = (historyItem: string) => {
    setQuery(historyItem);
    setShowSuggestions(false);
    onSearch(historyItem); // Tìm kiếm lại khi chọn từ lịch sử
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

  return (
    <div className="flex absolute top-2 left-2 z-10 bg-white p-2 rounded-lg shadow-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Tìm kiếm..."
          className="p-2 mr-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {showSuggestions && (
          <ul className="absolute top-full left-0 right-0 bg-white shadow-md rounded-md max-h-40 overflow-y-auto">
            {isFocused && !query && searchHistory.length > 0 && (
              <>
                <li className="p-2 text-sm font-medium text-gray-500 border-b flex justify-between items-center">
                  Lịch sử tìm kiếm
                  <button
                    onClick={clearHistory}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Xóa lịch sử
                  </button>
                </li>
                {searchHistory.map((historyItem, index) => (
                  <li
                    key={index}
                    onClick={() => handleHistoryClick(historyItem.name)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {historyItem.name}
                  </li>
                ))}
              </>
            )}
            {query && suggestions.length > 0 && (
              <>
                <li className="p-2 text-sm font-medium text-gray-500 border-b">
                  Gợi ý
                </li>
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {suggestion}
                  </li>
                ))}
              </>
            )}
          </ul>
        )}
      </div>
      <button
        onClick={handleClear}
        className="ml-2 border-1 border-gray-400 rounded-md px-3 py-1 hover:bg-gray-200"
      >
        Xóa
      </button>
    </div>
  );
};

export default SearchBar;
