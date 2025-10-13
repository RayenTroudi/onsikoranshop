# ONSi Admin Panel

A complete admin management system for the ONSi Quranic Verses Box e-commerce website.

## Features

### 🔐 **Firebase Authentication Integration**
- Integrated with existing Firebase Authentication system
- Role-based access control using Firestore
- Admin users determined by `role: 'admin'` or `isAdmin: true` in user document
- Secure logout functionality

### 📊 **Dashboard**
- Business overview with key metrics
- Total products, orders, revenue, and customers
- Recent activity feed
- Real-time statistics

### 📦 **Product Management (CRUD)**
- **Create**: Add new products with complete information
- **Read**: View all products in a searchable, filterable table
- **Update**: Edit existing product details
- **Delete**: Remove products with confirmation dialog

**Product Features:**
- Name, description, price, category
- Stock quantity management
- Product status (Active, Inactive, Draft)
- Image upload with preview
- Search and filter functionality

### 📋 **Order Management**
- View all customer orders
- Order details and status tracking
- Customer information display
- Revenue tracking

### ⚙️ **Settings Management**
- System configuration
- Site settings (name, email, currency)
- Tax rate configuration
- Admin preferences

### 🎨 **UI/UX Features**
- Modern, responsive design using Tailwind CSS
- Intuitive navigation with sidebar
- Modal dialogs for forms
- Real-time notifications
- Loading states and animations
- Mobile-friendly responsive layout

## File Structure

```
admin.html              # Main admin interface
admin-script.js         # Complete JavaScript functionality
admin-styles.css        # Additional styling for admin panel
```

## Getting Started

1. **Access the Admin Panel**
   ```
   Open admin.html in your browser
   ```

2. **Setup Admin User**
   - Follow the instructions in `ADMIN_SETUP.md` to set up admin role in Firebase
   - Sign in through the main website with your admin account
   - Access admin panel via user profile dropdown or direct URL

3. **Navigate Through Sections**
   - Dashboard: Overview and statistics
   - Products: Manage product catalog
   - Orders: View and manage orders
   - Settings: Configure system settings

## Product Management Workflow

### Adding a New Product
1. Click "Add Product" button
2. Fill in required fields:
   - Product Name (required)
   - Description
   - Price (required)
   - Category (required)
   - Stock Quantity
   - Status
3. Optionally upload an image
4. Click "Save Product"

### Editing a Product
1. Click "Edit" button on any product row
2. Modify the desired fields
3. Click "Save Product" to update

### Deleting a Product
1. Click "Delete" button on any product row
2. Confirm deletion in the dialog
3. Product will be permanently removed

## Search and Filter

- **Search**: Type in the search box to find products by name or description
- **Filter**: Use the category dropdown to filter products by category
- **Real-time**: Results update as you type

## Notifications

The system provides real-time feedback:
- ✅ Success notifications (green)
- ❌ Error notifications (red)
- ⚠️ Warning notifications (yellow)
- ℹ️ Info notifications (blue)

## Technical Details

### Dependencies
- **Tailwind CSS**: For styling and responsive design
- **Vanilla JavaScript**: No external JS frameworks required
- **Local Storage**: For demo data persistence

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- Progressive enhancement

### Security Notes
- Demo authentication (replace with real auth system)
- Client-side only (integrate with backend APIs)
- Input validation and sanitization recommended

## Integration with Backend

To connect with a real backend API:

1. **Replace the demo authentication** in `handleLogin()` method
2. **Update CRUD operations** to make actual API calls instead of local array manipulation
3. **Implement file upload** for product images
4. **Add error handling** for network requests
5. **Implement real-time updates** with WebSockets or polling

### API Endpoints (Example)
```javascript
// Products
GET    /api/products          # Get all products
POST   /api/products          # Create product
PUT    /api/products/:id      # Update product
DELETE /api/products/:id      # Delete product

// Orders
GET    /api/orders            # Get all orders
GET    /api/orders/:id        # Get order details

// Auth
POST   /api/auth/login        # Admin login
POST   /api/auth/logout       # Admin logout
```

## Customization

### Adding New Fields
1. Update the product form HTML in `admin.html`
2. Modify the `saveProduct()` method in `admin-script.js`
3. Update the product table rendering

### Styling Changes
- Modify `admin-styles.css` for custom styling
- Use Tailwind utility classes for quick changes
- Update color scheme variables

### Adding New Sections
1. Add navigation item in sidebar
2. Create new section HTML
3. Implement JavaScript functionality
4. Update the `switchSection()` method

## Performance Considerations

- Images are optimized for web display
- Lazy loading for large product lists
- Efficient DOM updates
- Minimal external dependencies

## Future Enhancements

- [ ] Advanced search with filters
- [ ] Bulk operations (delete, update)
- [ ] Export functionality (CSV, PDF)
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Role-based permissions
- [ ] Audit trail and activity logs
- [ ] Real-time notifications
- [ ] Advanced image management
- [ ] Inventory tracking

## Support

For questions or issues with the admin panel, please contact the development team.

---

**© 2024 ONSi - Admin Management System**