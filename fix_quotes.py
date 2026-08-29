import re

with open('src/components/ProLeagueDetails.tsx', 'r') as f:
    content = f.read()

# Replace className="... ${var} ..." with className={`... ${var} ...`}
# We can do this safely by looking for className=" and " and replacing them with className={` and `} if they contain ${
def replacer(match):
    inner = match.group(1)
    if '${' in inner:
        return f"className={{`{inner}`}}"
    return match.group(0)

content = re.sub(r'className="([^"]*)"', replacer, content)

with open('src/components/ProLeagueDetails.tsx', 'w') as f:
    f.write(content)
