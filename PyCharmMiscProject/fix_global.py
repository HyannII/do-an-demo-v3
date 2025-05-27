#!/usr/bin/env python3
"""
Script to fix global CONFIG_SOURCE declarations
"""

def fix_global_config_source():
    filename = "junction_traffic_light_simulator.py"
    
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Track if we're inside load_config_from_db function
    inside_function = False
    function_global_found = False
    
    new_lines = []
    
    for i, line in enumerate(lines):
        # Check if we're entering load_config_from_db function
        if "def load_config_from_db(sync=True):" in line:
            inside_function = True
            function_global_found = False
            new_lines.append(line)
            continue
        
        # Check if we found the main global declaration
        if inside_function and "global new_config, CYCLE_TIME, YELLOW_TIME, ALL_RED_TIME, PHASES, phase_starts, green_times, CONFIG_SOURCE" in line:
            function_global_found = True
            new_lines.append(line)
            continue
        
        # Check if we're leaving the function
        if inside_function and line.startswith("def ") and "load_config_from_db" not in line:
            inside_function = False
            function_global_found = False
        
        # Skip redundant global CONFIG_SOURCE declarations inside the function
        if inside_function and function_global_found and line.strip() == "global CONFIG_SOURCE":
            print(f"Removing redundant global declaration at line {i+1}: {line.strip()}")
            continue
        
        new_lines.append(line)
    
    # Write back the fixed content
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print("Fixed global CONFIG_SOURCE declarations")

if __name__ == "__main__":
    fix_global_config_source() 