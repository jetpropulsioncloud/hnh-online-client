from pathlib import Path
for name in ['tests/smoke-test.js','tests/ui-coordinator-test.js']:
    p=Path(name)
    s=p.read_text().replace('?v=074','?v=075').replace('v0.7.4','v0.7.5')
    p.write_text(s)
print('test version expectations updated')
