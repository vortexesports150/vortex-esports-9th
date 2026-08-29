const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /                                  <\/div>\n                                <\/div>\n                              <\/div>\n                            }\)/g,
  `                                  </div>
                                </div>
                              </div>
                            </div>
                          )}`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex 12");
