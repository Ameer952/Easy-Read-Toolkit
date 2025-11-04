How to run:
Run it in this order

1. change ip address
   run ipconfig in your cmd prompt
   look for IPv4 address
   go into frontend/lib/config.js
   paste ip here http://PASTE_IP_HERE:5000
   save file

2. backend
   open terminal
   cd into backend -> cd ./backend
   run -> node server.js

3. frontend
   open new terminal
   cd into frontend -> cd ./frontend
   run npx expo start


How to view the Database:

1. Move to backend
   open terminal
   cd into backend -> cd ./backend

2. Run Database
   in terminal: run sqlite3 users.db
   run .tables 
   {you should see two tables: "users" & "documents"}

3. View Users:
   run select * from users;
   TIP: if there are many users add a limit i.e SELECT * FROM users LIMIT 10;
   NOTE: ensure you include the semi colon at the end of your query as it wont work otherwise

4. View Documents:
   Follow the same steps as above but for documents
   run SELECT * FROM documents LIMIT 10;