"use client";

import React, { useState, useEffect, useRef } from "react";

interface SearchBarProps {
  onSearch: (name: string) => void;
  onClear: () => void;
  junctions: any[];
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onClear,
  junctions,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matchesQuery = (junctionName: string, query: string): boolean => {
    const queryWords = query.toLowerCase().trim().split(/\s+/);
    const nameWords = junctionName.toLowerCase().trim().split(/\s+/);

    let wordIndex = 0;
    for (const queryWord of queryWords) {
      wordIndex = nameWords.findIndex(
        (nameWord, index) =>
          index >= wordIndex && nameWord.startsWith(queryWord)
      );
      if (wordIndex === -1) return false;
      wordIndex++;
    }
    return true;
  };

  useEffect(() => {
    if (query) {
      const filteredSuggestions = junctions.reduce<string[]>(
        (acc, junction) => {
          if (matchesQuery(junction.junctionName, query)) {
            acc.push(junction.junctionName);
          }
          return acc;
        },
        []
      );
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, junctions]);

  const handleClear = () => {
    setQuery("");
    setShowSuggestions(false);
    onClear();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  return (
    <div className="flex absolute top-2 left-2 z-10 bg-white p-2 rounded-lg border-2 border-gray-400">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm..."
          className="p-2 mr-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={handleClear}
        className="ml-2 border-2 border-gray-400 rounded-md px-3 py-1 hover:bg-gray-200"
      >
        Xóa
      </button>
    </div>
  );
};

export default SearchBar;
