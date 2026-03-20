from pathlib import Path
lines=Path('game.html').read_text('utf-8').splitlines()
for i in range(1422, 1466):
    print(f'{i+1}: {lines[i]}')

