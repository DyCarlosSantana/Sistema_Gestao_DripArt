import os

file_path = 'app.py'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '# ─── FRONTEND (React App)' in line:
        start_idx = i
        break

if start_idx != -1:
    for i in range(start_idx + 1, len(lines)):
        if line.strip().startswith('# ─── ') and not 'FRONTEND' in lines[i]:
            # Next block found
            if '# ─── DASHBOARD' in lines[i]:
                end_idx = i
                break
            
if start_idx != -1 and end_idx != -1:
    block = lines[start_idx:end_idx]
    del lines[start_idx:end_idx]
    
    # insert before if __name__ == '__main__':
    main_idx = -1
    for i, line in enumerate(lines):
        if "if __name__ == '__main__':" in line:
            main_idx = i
            break
            
    if main_idx != -1:
        # Prepend block before main
        block_str = ''.join(block) + '\n'
        lines.insert(main_idx, block_str)
    
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print("Frontend catch-all routes moved successfully!")
    else:
        print("Could not find __main__")
else:
    print(f"Could not find block. start={start_idx}, end={end_idx}")
