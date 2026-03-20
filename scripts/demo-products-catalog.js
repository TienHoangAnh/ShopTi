/**
 * Danh sách sản phẩm mẫu theo danh mục + hãng (brand).
 * categoryName phải trùng tên category trong DB (seed-mongo).
 */
function demoProductRows(categoryNameToId) {
  const rows = [];
  const img = '/images/placeholder.svg';

  function add(categoryName, brand, name, description, price, stock, color, sizes) {
    const catId = categoryNameToId[categoryName];
    if (!catId) return;
    const sz = Array.isArray(sizes) && sizes.length ? sizes : [];
    rows.push({
      category: catId,
      brand,
      name,
      description: description || '',
      price: Number(price),
      stock: Number(stock) || 0,
      image_url: img,
      color: color || null,
      sizes: sz,
      size_tags: sz.length ? sz.join('|') : null,
      size: sz.length ? sz.join(', ') : null,
    });
  }

  // --- Điện Thoại & Phụ Kiện ---
  const phoneCat = 'Điện Thoại & Phụ Kiện';
  add(phoneCat, 'Apple', 'iPhone 15 Pro Max 256GB', 'Chip A17 Pro, Titan tự nhiên, camera 48MP', 1199.99, 40, 'Titan tự nhiên', ['256GB', '512GB', '1TB']);
  add(phoneCat, 'Apple', 'iPhone 14 128GB', 'Chip A15 Bionic, pin cả ngày', 699.99, 55, 'Đen', ['128GB', '256GB']);
  add(phoneCat, 'Samsung', 'Samsung Galaxy S24 Ultra', 'S Pen, AI, màn 6.8" QHD+', 1099.99, 35, 'Titan xám', ['256GB', '512GB']);
  add(phoneCat, 'Samsung', 'Samsung Galaxy A55 5G', '5G, camera OIS, pin 5000mAh', 349.99, 80, 'Xanh nhạt', ['128GB', '256GB']);
  add(phoneCat, 'Oppo', 'OPPO Reno11 Pro 5G', 'Camera chân dung, sạc nhanh 80W', 459.99, 45, 'Vàng ánh trăng', ['256GB']);
  add(phoneCat, 'Oppo', 'OPPO A78 5G', 'Màn AMOLED, loa kép', 219.99, 90, 'Đen', ['128GB']);
  add(phoneCat, 'Xiaomi', 'Xiaomi 14 Ultra', 'Leica camera, Snapdragon 8 Gen 3', 999.99, 25, 'Đen', ['512GB', '1TB']);
  add(phoneCat, 'Redmi', 'Redmi Note 13 Pro 5G', 'Camera 200MP, sạc 120W', 279.99, 100, 'Xanh dương', ['128GB', '256GB']);
  add(phoneCat, 'Realme', 'realme 12 Pro+ 5G', 'Telephoto periscope, da vegan', 329.99, 60, 'Vàng', ['256GB']);
  add(phoneCat, 'Vivo', 'vivo V30 Pro', 'Camera Zeiss, chụp đêm', 419.99, 50, 'Trắng ngọc', ['256GB']);
  add(phoneCat, 'Apple', 'AirPods Pro 2 USB-C', 'ANC, Spatial Audio', 249.99, 120, 'Trắng', ['One size']);
  add(phoneCat, 'Samsung', 'Galaxy Buds2 Pro', 'ANC, 360 Audio', 179.99, 85, 'Tím', ['One size']);

  // --- Máy Tính & Laptop ---
  const pc = 'Máy Tính & Laptop';
  add(pc, 'Apple', 'MacBook Air M3 13" 256GB', 'Chip M3, pin 18h', 1099.99, 30, 'Bạc', ['8GB/256GB', '16GB/512GB']);
  add(pc, 'Apple', 'MacBook Pro 14" M3 Pro', 'Màn Liquid Retina XDR', 1999.99, 15, 'Xám không gian', ['512GB', '1TB']);
  add(pc, 'Dell', 'Dell XPS 13 Plus', 'Intel Core Ultra, OLED 3.5K', 1299.99, 22, 'Bạc', ['16GB/512GB']);
  add(pc, 'HP', 'HP Pavilion 15', 'Ryzen 7, SSD 512GB', 649.99, 40, 'Vàng cát', ['16GB/512GB']);
  add(pc, 'Lenovo', 'Lenovo ThinkPad E14', 'Bàn phím ThinkPad, bền bỉ', 799.99, 35, 'Đen', ['16GB/512GB']);
  add(pc, 'Asus', 'ASUS ROG Strix G16', 'RTX 4060, màn 165Hz', 1399.99, 18, 'Đen', ['16GB/1TB']);
  add(pc, 'Asus', 'ASUS Zenbook 14 OLED', 'OLED 2.8K, mỏng nhẹ', 999.99, 28, 'Xanh', ['16GB/512GB']);
  add(pc, 'Logitech', 'Chuột Logitech MX Master 3S', 'Silent click, đa thiết bị', 99.99, 150, 'Đen', ['One size']);
  add(pc, 'Keychron', 'Bàn phím Keychron K8 Pro', 'Mechanical, Bluetooth', 119.99, 70, 'Xám', ['One size']);

  // --- Thiết Bị Điện Tử ---
  const elec = 'Thiết Bị Điện Tử';
  add(elec, 'Sony', 'Tai nghe Sony WH-1000XM5', 'ANC đỉnh, 30h pin', 349.99, 45, 'Đen', ['One size']);
  add(elec, 'Sony', 'Loa Bluetooth Sony SRS-XB100', 'Extra Bass, chống nước', 59.99, 80, 'Đen', ['One size']);
  add(elec, 'JBL', 'JBL Flip 6', 'Chống nước IP67', 129.99, 95, 'Đỏ', ['One size']);
  add(elec, 'Bose', 'Loa Bose SoundLink Flex', 'Âm thanh rõ, outdoor', 149.99, 40, 'Xanh đá', ['One size']);
  add(elec, 'LG', 'Màn hình LG UltraGear 27" QHD', '165Hz, HDR10', 329.99, 25, 'Đen', ['27 inch']);

  // --- Thời Trang Nam ---
  const men = 'Thời Trang Nam';
  add(men, 'Nike', 'Áo thun Nike Dri-FIT', 'Thoát mồ hôi, co giãn', 29.99, 120, 'Đen', ['S', 'M', 'L', 'XL']);
  add(men, 'Nike', 'Giày Nike Air Max', 'Đệm khí, đi bộ êm', 129.99, 60, 'Trắng', ['40', '41', '42', '43', '44']);
  add(men, 'Adidas', 'Áo khoác Adidas Windbreaker', 'Chống gió nhẹ', 79.99, 55, 'Xanh navy', ['S', 'M', 'L', 'XL']);
  add(men, 'Uniqlo', 'Quần jean Uniqlo Slim Fit', 'Co giãn, form gọn', 49.99, 90, 'Xanh đậm', ['28', '29', '30', '31', '32', '33']);
  add(men, "Levi's", "Quần jean Levi's 501", 'Ống thẳng cổ điển', 89.99, 40, 'Xanh indigo', ['30', '32', '34', '36']);

  // --- Thời Trang Nữ ---
  const women = 'Thời Trang Nữ';
  add(women, 'Zara', 'Váy midi Zara linen', 'Vải linen, mùa hè', 59.99, 70, 'Be', ['XS', 'S', 'M', 'L']);
  add(women, 'H&M', 'Áo blazer H&M', 'Công sở thanh lịch', 69.99, 50, 'Đen', ['XS', 'S', 'M', 'L']);
  add(women, 'Mango', 'Túi tote Mango da PU', 'Đựng laptop 13"', 79.99, 35, 'Nâu', ['One size']);

  // --- Mẹ & Bé ---
  const baby = 'Mẹ & Bé';
  add(baby, 'Moony', 'Tã dán Moony Natural NB', 'Mềm mại, thấm hút', 24.99, 200, 'Trắng', ['NB', 'S', 'M']);
  add(baby, 'Abbott', 'Sữa Abbott Grow Gold 800g', 'Dinh dưỡng 1–2 tuổi', 34.99, 150, 'Vàng', ['800g']);
  add(baby, 'Pigeon', 'Bình sữa Pigeon PP 240ml', 'Núm silicone mềm', 12.99, 180, 'Trong', ['240ml']);

  // --- Nhà Cửa & Đời Sống ---
  const home = 'Nhà Cửa & Đời Sống';
  add(home, 'IKEA', 'Kệ sách IKEA BILLY', 'Gỗ công nghiệp, lắp ráp', 79.99, 30, 'Trắng', ['80x28x202cm']);
  add(home, 'Lock&Lock', 'Bộ hộp Lock&Lock 6 hộp', 'Tủ lạnh & lò vi sóng', 39.99, 85, 'Trong', ['Set 6']);

  // --- Sắc Đẹp ---
  const beauty = 'Sắc Đẹp';
  add(beauty, "L'Oreal", 'Serum L’Oreal Revitalift', 'Chống lão hóa', 24.99, 100, 'Vàng', ['30ml']);
  add(beauty, 'Maybelline', 'Son Maybelline Super Stay', 'Bền màu', 12.99, 200, 'Đỏ cam', ['4.2ml']);
  add(beauty, 'Innisfree', 'Mặt nạ Innisfree Green Tea', 'Dưỡng ẩm', 1.99, 300, 'Xanh', ['1 miếng']);

  // --- Máy Ảnh & Máy Quay Phim ---
  const cam = 'Máy Ảnh & Máy Quay Phim';
  add(cam, 'Canon', 'Máy ảnh Canon EOS R50 Kit', 'Mirrorless APS-C, quay 4K', 799.99, 20, 'Đen', ['Kit 18-45']);
  add(cam, 'Nikon', 'Nikon Z30 + lens kit', 'Vlog, flip màn hình', 749.99, 18, 'Đen', ['Kit 16-50']);
  add(cam, 'Sony', 'Sony Alpha 7 IV body', 'Full-frame hybrid', 2499.99, 10, 'Đen', ['Body']);
  add(cam, 'GoPro', 'GoPro Hero 12 Black', 'Quay 5.3K, chống nước', 399.99, 35, 'Đen', ['One size']);

  // --- Sức Khỏe ---
  const health = 'Sức Khỏe';
  add(health, 'Omron', 'Máy đo huyết áp Omron HEM-7156', 'Tự động, màn LCD', 59.99, 45, 'Trắng', ['One size']);
  add(health, 'Centrum', 'Vitamin Centrum Adults', 'Đa vitamin', 19.99, 120, 'Vàng', ['Hộp 100 viên']);

  // --- Đồng Hồ ---
  const watch = 'Đồng Hồ';
  add(watch, 'Casio', 'Đồng hồ Casio G-Shock GA-2100', 'Chống sốc', 99.99, 60, 'Đen', ['One size']);
  add(watch, 'Seiko', 'Seiko 5 Sports SRPD', 'Automatic, lặn 100m', 279.99, 25, 'Xanh dương', ['One size']);
  add(watch, 'Fossil', 'Fossil Gen 6 Hybrid', 'Thông minh lai cơ', 199.99, 30, 'Nâu', ['One size']);

  // --- Giày Dép Nữ / Nam ---
  add('Giày Dép Nữ', "Biti's", 'Giày thể thao Bitis Hunter', 'Đế êm, năng động', 39.99, 100, 'Hồng', ['36', '37', '38', '39']);
  add('Giày Dép Nữ', 'Nike', 'Giày Nike Air Force 1', 'Classic trắng', 109.99, 50, 'Trắng', ['36', '37', '38', '39', '40']);
  add('Giày Dép Nam', 'Converse', 'Converse Chuck Taylor All Star', 'Canvas cổ điển', 69.99, 70, 'Đen', ['40', '41', '42', '43', '44']);
  add('Giày Dép Nam', 'Nike', 'Nike Revolution 6', 'Chạy bộ hằng ngày', 64.99, 85, 'Xám', ['40', '41', '42', '43', '44']);

  // --- Túi Ví Nữ ---
  add('Túi Ví Nữ', 'Charles & Keith', 'Túi đeo vai Charles & Keith', 'Da PU, tối giản', 89.99, 40, 'Đen', ['One size']);
  add('Túi Ví Nữ', 'Coach', 'Ví Coach zip around', 'Da thật', 149.99, 25, 'Nâu', ['One size']);

  // --- Thiết Bị Điện Gia Dụng ---
  const appliance = 'Thiết Bị Điện Gia Dụng';
  add(appliance, 'Panasonic', 'Nồi cơm điện Panasonic 1.8L', 'Dẻo thơm', 89.99, 40, 'Trắng', ['1.8L']);
  add(appliance, 'Philips', 'Máy xay Philips HR2228', '2 cối', 79.99, 35, 'Đen', ['One size']);
  add(appliance, 'Electrolux', 'Máy hút bụi Electrolux', 'Không túi', 199.99, 22, 'Xám', ['One size']);

  // --- Phụ Kiện & Trang Sức Nữ ---
  add('Phụ Kiện & Trang Sức Nữ', 'PNJ', 'Dây chuyền PNJ bạc 925', 'Đính đá CZ', 49.99, 60, 'Bạc', ['One size']);
  add('Phụ Kiện & Trang Sức Nữ', 'Pandora', 'Charm Pandora Moments', 'Mix & match', 39.99, 90, 'Bạc', ['One size']);

  // --- Thể Thao & Du Lịch ---
  const sport = 'Thể Thao & Du Lịch';
  add(sport, 'Under Armour', 'Áo Under Armour HeatGear', 'Thoát mồ hôi', 34.99, 75, 'Đen', ['S', 'M', 'L', 'XL']);
  add(sport, 'Decathlon', 'Xe đạp đường phố Riverside 500', 'Khung nhôm', 449.99, 12, 'Xám', ['M', 'L']);

  // --- Bách Hóa Online ---
  add('Bách Hóa Online', 'Nestlé', 'Sữa Nestlé Milo lon 240ml', 'Năng lượng', 0.99, 500, 'Nâu', ['240ml']);
  add('Bách Hóa Online', 'Knorr', 'Hạt nêm Knorr 400g', 'Nấu ăn', 3.99, 300, 'Vàng', ['400g']);

  // --- Ô Tô & Xe Máy & Xe Đạp ---
  add('Ô Tô & Xe Máy & Xe Đạp', 'Honda', 'Xe máy Honda Vision (mô hình trưng bày)', 'Phiên bản giới hạn', 29.99, 50, 'Trắng', ['One size']);
  add('Ô Tô & Xe Máy & Xe Đạp', 'Yamaha', 'Mũ bảo hiểm Yamaha fullface', 'Tiêu chuẩn', 45.99, 80, 'Đen', ['M', 'L']);

  // --- Nhà Sách Online ---
  add('Nhà Sách Online', 'NXB Trẻ', 'Sách "Đắc nhân tâm" (bản mới)', 'Self-help kinh điển', 6.99, 200, 'Vàng', ['One size']);
  add('Nhà Sách Online', 'Kim Đồng', 'Truyện tranh Doraemon tập 1', 'Thiếu nhi', 2.99, 350, 'Xanh', ['One size']);

  // --- Balo & Túi Ví Nam ---
  add('Balo & Túi Ví Nam', 'The North Face', 'Balo The North Face Borealis', '28L, laptop 15"', 99.99, 40, 'Đen', ['28L']);
  add('Balo & Túi Ví Nam', 'Herschel', 'Balo Herschel Little America', 'Vintage', 109.99, 35, 'Navy', ['25L']);

  // --- Thời Trang Trẻ Em ---
  add('Thời Trang Trẻ Em', "Carter's", 'Bộ body Carter 3 chiếc', 'Cotton', 19.99, 120, 'Trắng', ['3M', '6M', '9M']);
  add('Thời Trang Trẻ Em', 'Zara Kids', 'Áo khoác Zara Kids', 'Thu đông', 34.99, 65, 'Xám', ['4Y', '6Y', '8Y']);

  // --- Đồ Chơi ---
  add('Đồ Chơi', 'Lego', 'Lego Classic Creative Brick Box', '790 viên', 49.99, 55, 'Đa màu', ['One size']);
  add('Đồ Chơi', 'Mattel', 'Búp bê Barbie Career', 'Đồ chơi an toàn', 24.99, 90, 'Hồng', ['One size']);

  // --- Giặt Giũ & Chăm Sóc Nhà Cửa ---
  add('Giặt Giũ & Chăm Sóc Nhà Cửa', 'Ariel', 'Nước giặt Ariel 3.6kg', 'Sạch sâu', 12.99, 150, 'Xanh', ['3.6kg']);
  add('Giặt Giũ & Chăm Sóc Nhà Cửa', 'Surf', 'Bột giặt Surf hương hoa', 'Thơm lâu', 8.99, 180, 'Hồng', ['5.5kg']);

  // --- Chăm Sóc Thú Cưng ---
  add('Chăm Sóc Thú Cưng', 'Royal Canin', 'Thức ăn Royal Canin Medium Adult', 'Chó trung', 59.99, 70, 'Vàng', ['4kg']);
  add('Chăm Sóc Thú Cưng', 'Pedigree', 'Pate Pedigree vị gà', 'Chó nhỏ', 0.99, 400, 'Vàng', ['100g']);

  // --- Dụng cụ và thiết bị tiện ích ---
  add('Dụng cụ và thiết bị tiện ích', 'Bosch', 'Máy khoan Bosch GSB 120', 'Đa năng', 89.99, 30, 'Xanh', ['One size']);
  add('Dụng cụ và thiết bị tiện ích', 'Stanley', 'Bộ tua vít Stanley 45 món', 'Gia đình', 34.99, 45, 'Vàng', ['Set 45']);

  return rows;
}

module.exports = { demoProductRows };
