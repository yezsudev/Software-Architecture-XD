# 🚀 CMS Quick Start Guide

Get your CMS application running in 5 minutes!

## Prerequisites Check

- [ ] Node.js installed (from https://nodejs.org/)
- [ ] MySQL running with cms_db database
- [ ] Backend code in `cms-be/` folder

---

## Step 1: Start the Backend (Terminal 1)

```bash
cd cms-be
mvnw spring-boot:run
```

Wait for the message: **"CmsBeApplication started"**

✅ Backend is ready on `http://localhost:8080`

---

## Step 2: Start the Frontend (Terminal 2)

```bash
cd cms-fe
npm install
npm run dev
```

Wait for the message: **"ready in Xms"**

✅ Frontend is ready on `http://localhost:3000`

---

## Step 3: Open the Application

Open your browser: **http://localhost:3000**

You should see:
- 📚 CMS Dashboard header
- 3 pre-loaded articles
- Create Article form

---

## ✅ Quick Test

### Test 1: View Articles
- You should see 3 articles on the page
- Total Articles: 3 (shown in header)

### Test 2: Create Article
1. Fill the form on the right:
   - Title: `My First Article`
   - Author: `Your Name`
   - Content: `This is my first article...`
2. Click **📝 Publish Article**
3. See success message
4. New article appears in the list
5. Article count increases to 4

### Test 3: Refresh
- Click **🔄 Refresh** button
- List reloads without page refresh

---

## 🎉 Success!

Your CMS is running perfectly! 

### What You Can Do Now

- ✅ View all articles in grid layout
- ✅ Create new articles
- ✅ See form validation errors
- ✅ Refresh article list
- ✅ View responsive design on mobile

---

## 📱 Mobile Test

Resize your browser window or open on mobile to see:
- Single column layout
- Responsive form
- Touch-friendly buttons
- Optimized article cards

---

## 🛑 To Stop the Application

### Stop Backend
```
Press Ctrl+C in Backend Terminal (Terminal 1)
```

### Stop Frontend
```
Press Ctrl+C in Frontend Terminal (Terminal 2)
```

---

## 🔧 Troubleshooting

### ❌ "Cannot GET /api/articles"
**Solution:** Backend not running. Run Step 1 again.

### ❌ "Cannot find module 'react'"
**Solution:** 
```bash
cd cms-fe
npm install
```

### ❌ "Port 3000 already in use"
**Solution:** Kill the process or use different port:
- Edit `cms-fe/vite.config.js`
- Change `port: 3000` to `port: 3001`

### ❌ "Database connection failed"
**Solution:** 
1. Ensure MySQL is running
2. Check credentials in `cms-be/src/main/resources/application.properties`

---

## 📂 File Structure

```
cms-be/          ← Backend (Spring Boot)
cms-fe/          ← Frontend (React) ✨ NEW!
├── src/
│   ├── components/
│   ├── services/apiService.js
│   ├── App.jsx
│   └── styles/
├── package.json
├── vite.config.js
└── README.md
```

---

## 📚 Documentation

For detailed information, see:
- **cms-fe/README.md** - Frontend documentation
- **SETUP_GUIDE.md** - Complete setup guide
- **FRONTEND_SUMMARY.md** - Development summary

---

## 🎯 Next Steps

1. Explore the code in `cms-fe/src/`
2. Try modifying article cards in `ArticleList.jsx`
3. Add new validation rules in `CreateArticleForm.jsx`
4. Customize colors in CSS files
5. Read full documentation for enhancements

---

## 💡 Cool Features to Try

1. **Create Multiple Articles** - See grid layout adapt
2. **Try Invalid Input** - Form validates automatically
3. **Refresh Button** - No page reload needed
4. **Mobile View** - Resize browser to test responsive layout
5. **Success Message** - See toast notification after creation

---

## ❓ FAQ

**Q: Can I run on a different port?**
A: Yes, edit `cms-fe/vite.config.js` and change the port number.

**Q: Can I deploy to production?**
A: Yes, run `npm run build` in cms-fe folder, then serve `dist/` folder.

**Q: Can I edit existing articles?**
A: Current version supports create and list. Edit feature can be added.

**Q: How do I connect to a different backend?**
A: Edit `cms-fe/src/services/apiService.js` and change `API_BASE_URL`.

---

## 📞 Common Commands

**Start backend:**
```bash
cd cms-be && mvnw spring-boot:run
```

**Start frontend:**
```bash
cd cms-fe && npm run dev
```

**Build frontend for production:**
```bash
cd cms-fe && npm run build
```

**Clean and reinstall frontend:**
```bash
cd cms-fe && rm -rf node_modules && npm install
```

---

## 🏁 You're All Set!

Your CMS application is ready to use. Start from Step 1 and enjoy! 🎉

For more details, read the full documentation in SETUP_GUIDE.md
