from pathlib import Path
p=Path('tests/ui-coordinator-test.js')
s=p.read_text()
s=s.replace('?v=075','?v=076').replace("version:'0.7.4'","version:'0.7.6'").replace('Tabletop Client v0.7.5','Tabletop Client v0.7.6')
s=s.replace("assert(client.includes(\"beginner:{label:'Beginner',delay:1250\"),'Beginner AI pacing profile missing');", "assert(client.includes(\"beginner:{label:'Beginner',skill:'beginner'\"),'Beginner AI skill profile missing');")
s=s.replace("assert(client.includes('Sturdy, defensive value'),'Stonecap archetype onboarding copy missing');", "assert(client.includes('Sturdy, recursive defense'),'Stonecap archetype onboarding copy missing');")
s += "\nassert(client.includes('AI Pace'),'AI pace should be separate from difficulty');\nassert(client.includes('View Hearthkeeper card'),'Hearthkeeper reference access missing');\nconsole.log('✓ Hearthkeeper identity and AI skill/pacing controls');\n"
p.write_text(s)
print('ui test fixed')
