truncate table public.books cascade;

insert into public.categories (category_id, name, description)
values
  ('VH', 'Văn học', 'Các tác phẩm kinh điển và hiện đại từ Việt Nam và thế giới.'),
  ('KT', 'Kinh tế & Kinh doanh', 'Kỹ năng quản trị, tài chính và tư duy kinh doanh.'),
  ('TL', 'Tâm lý học', 'Nghiên cứu về tâm lý con người và phát triển bản thân.'),
  ('KH', 'Khoa học & Đời sống', 'Khám phá vũ trụ và khoa học ứng dụng.'),
  ('LS', 'Lịch sử & Văn hóa', 'Hành trình tìm hiểu qua các thời đại và nền văn minh.'),
  ('NN', 'Ngoại ngữ', 'Tài liệu học tập và giáo trình các ngôn ngữ phổ biến.'),
  ('GD', 'Giáo dục', 'Sách giáo khoa và các phương pháp sư phạm hiện đại.'),
  ('TH', 'Triết học & Tôn giáo', 'Các tư tưởng lớn và hệ thống niềm tin.'),
  ('MG', 'Manga', 'Truyện tranh Nhật Bản với nhiều thể loại hấp dẫn.'),
  ('LN', 'Light Novel', 'Tiểu thuyết nhẹ kèm minh họa phong cách Nhật Bản.')
on conflict (category_id) do nothing;

insert into public.books 
  (book_id, title, author, publisher, isbn, category_id, price, sale_price, is_on_sale, description, slug, is_published, publish_year, quantity, location, image_url)
values
  ('LN-001', 'Re:Zero - Bắt Đầu Lại Ở Thế Giới Khác (Tập 1)', 'Tappei Nagatsuki', 'Kim Đồng', '9786042163828', 'LN', 115000, 103500, true, 'Khởi đầu hành trình tử vong luân hồi của Natsuki Subaru.', 're-zero-tap-1', true, 2014, 50, 'Kệ LN-01', 'LN-001.jpg'),
  ('LN-002', 'Re:Zero - Bắt Đầu Lại Ở Thế Giới Khác (Tập 2)', 'Tappei Nagatsuki', 'Kim Đồng', '9786042163835', 'LN', 115000, 115000, false, 'Subaru đối mặt với thử thách tại dinh thự Roswaal.', 're-zero-tap-2', true, 2014, 45, 'Kệ LN-01', 'LN-002.jpg'),
  ('LN-003', 'Re:Zero - Bắt Đầu Lại Ở Thế Giới Khác (Tập 3)', 'Tappei Nagatsuki', 'Kim Đồng', '9786042163842', 'LN', 120000, 120000, false, 'Sự thật đằng sau những vòng lặp và lời nguyền Ma nữ.', 're-zero-tap-3', true, 2015, 60, 'Kệ LN-01', 'LN-003.jpg'),
  ('LN-004', 'Re:Zero - Bắt Đầu Lại Ở Thế Giới Khác (Tập 4)', 'Tappei Nagatsuki', 'Kim Đồng', '9786042163859', 'LN', 125000, 125000, false, 'Cuộc tuyển vương và những phe phái bắt đầu lộ diện.', 're-zero-tap-4', true, 2015, 40, 'Kệ LN-01', 'LN-004.jpg'),
  ('LN-005', 'The Eminence in Shadow (Tập 1)', 'Daisuke Aizawa', 'Kim Đồng', '9786042228510', 'LN', 130000, 117000, true, 'Cid Kagenou thức tỉnh ở dị giới và lập Shadow Garden.', 'the-eminence-in-shadow-tap-1', true, 2018, 100, 'Kệ LN-02', 'LN-005.jpg'),
  ('LN-006', 'The Eminence in Shadow (Tập 2)', 'Daisuke Aizawa', 'Kim Đồng', '9786042228527', 'LN', 130000, 130000, false, 'Sự kiện tại Thánh địa Lindwurm.', 'the-eminence-in-shadow-tap-2', true, 2019, 85, 'Kệ LN-02', 'LN-006.jpg'),
  ('LN-007', 'The Eminence in Shadow (Tập 3)', 'Daisuke Aizawa', 'Kim Đồng', '9786042228534', 'LN', 135000, 135000, false, 'Hỗn loạn tại Vô Pháp Thành và Huyết Nữ Vương.', 'the-eminence-in-shadow-tap-3', true, 2019, 70, 'Kệ LN-02', 'LN-007.jpg'),
  ('LN-008', 'The Eminence in Shadow (Tập 4)', 'Daisuke Aizawa', 'Kim Đồng', '9786042228541', 'LN', 140000, 140000, false, 'Âm mưu tại vương quốc Oriana.', 'the-eminence-in-shadow-tap-4', true, 2021, 65, 'Kệ LN-02', 'LN-008.jpg'),
  ('LN-009', 'Alya Che Giấu Cảm Xúc Bằng Tiếng Nga (Tập 1)', 'Sunsunsun', 'Kim Đồng', '9786042230001', 'LN', 110000, 99000, true, 'Cô nàng Alya xinh đẹp thầm thích Masachika.', 'roshidere-tap-1', true, 2021, 120, 'Kệ LN-03', 'LN-009.jpg'),
  ('LN-010', 'Alya Che Giấu Cảm Xúc Bằng Tiếng Nga (Tập 2)', 'Sunsunsun', 'Kim Đồng', '9786042230002', 'LN', 110000, 110000, false, 'Diễn biến mới trong hội học sinh.', 'roshidere-tap-2', true, 2021, 110, 'Kệ LN-03', 'LN-010.jpg'),
  ('LN-011', 'Alya Che Giấu Cảm Xúc Bằng Tiếng Nga (Tập 3)', 'Sunsunsun', 'Kim Đồng', '9786042230003', 'LN', 115000, 115000, false, 'Kỳ nghỉ hè đầy biến động.', 'roshidere-tap-3', true, 2022, 90, 'Kệ LN-03', 'LN-011.jpg'),
  ('LN-012', 'Alya Che Giấu Cảm Xúc Bằng Tiếng Nga (Tập 4)', 'Sunsunsun', 'Kim Đồng', '9786042230004', 'LN', 120000, 120000, false, 'Cuộc đối đầu nảy lửa với Yuki.', 'roshidere-tap-4', true, 2022, 95, 'Kệ LN-03', 'LN-012.jpg'),
  ('MG-001', 'Frieren - Pháp Sư Tiễn Táng (Tập 1)', 'Kanehito Yamada', 'Kim Đồng', '9786042270014', 'MG', 65000, 58500, true, 'Hành trình chiêm nghiệm cuộc đời của pháp sư Elf.', 'frieren-tap-1', true, 2020, 200, 'Kệ MG-01', 'MG-001.jpg'),
  ('MG-002', 'Frieren - Pháp Sư Tiễn Táng (Tập 2)', 'Kanehito Yamada', 'Kim Đồng', '9786042270021', 'MG', 65000, 65000, false, 'Hướng về miền bắc giá lạnh.', 'frieren-tap-2', true, 2020, 180, 'Kệ MG-01', 'MG-002.jpg'),
  ('MG-003', 'Frieren - Pháp Sư Tiễn Táng (Tập 3)', 'Kanehito Yamada', 'Kim Đồng', '9786042270038', 'MG', 65000, 65000, false, 'Chạm trán tộc Quỷ.', 'frieren-tap-3', true, 2020, 175, 'Kệ MG-01', 'MG-003.jpg'),
  ('MG-004', 'Frieren - Pháp Sư Tiễn Táng (Tập 4)', 'Kanehito Yamada', 'Kim Đồng', '9786042270045', 'MG', 70000, 70000, false, 'Kỳ thi pháp sư cấp 1.', 'frieren-tap-4', true, 2021, 160, 'Kệ MG-01', 'MG-004.jpg'),
  ('MG-005', 'Jujutsu Kaisen (Tập 1)', 'Gege Akutami', 'Kim Đồng', '9786042200011', 'MG', 60000, 54000, true, 'Itadori Yuji và ngón tay Sukuna.', 'jujutsu-tap-1', true, 2018, 300, 'Kệ MG-02', 'MG-005.jpg'),
  ('MG-006', 'Jujutsu Kaisen (Tập 2)', 'Gege Akutami', 'Kim Đồng', '9786042200028', 'MG', 60000, 60000, false, 'Đụng độ nguyền hồn đặc cấp.', 'jujutsu-tap-2', true, 2018, 250, 'Kệ MG-02', 'MG-006.jpg'),
  ('MG-007', 'Jujutsu Kaisen (Tập 3)', 'Gege Akutami', 'Kim Đồng', '9786042200035', 'MG', 60000, 60000, false, 'Giao lưu giữa hai trường Tokyo và Kyoto.', 'jujutsu-tap-3', true, 2018, 260, 'Kệ MG-02', 'MG-007.jpg'),
  ('MG-008', 'Jujutsu Kaisen (Tập 4)', 'Gege Akutami', 'Kim Đồng', '9786042200042', 'MG', 65000, 65000, false, 'Sức mạnh của Gojo Satoru.', 'jujutsu-tap-4', true, 2019, 240, 'Kệ MG-02', 'MG-008.jpg'),
  ('MG-009', 'Dandadan (Tập 1)', 'Yukinobu Tatsu', 'Kim Đồng', '9786042250016', 'MG', 75000, 67500, true, 'Ma quỷ và người ngoài hành tinh.', 'dandadan-tap-1', true, 2021, 150, 'Kệ MG-03', 'MG-009.jpg'),
  ('MG-010', 'Dandadan (Tập 2)', 'Yukinobu Tatsu', 'Kim Đồng', '9786042250023', 'MG', 75000, 75000, false, 'Trận chiến với Turbo Granny.', 'dandadan-tap-2', true, 2021, 140, 'Kệ MG-03', 'MG-010.jpg'),
  ('MG-011', 'Dandadan (Tập 3)', 'Yukinobu Tatsu', 'Kim Đồng', '9786042250030', 'MG', 75000, 75000, false, 'Sự xuất hiện của Aira.', 'dandadan-tap-3', true, 2022, 130, 'Kệ MG-03', 'MG-011.jpg'),
  ('MG-012', 'Dandadan (Tập 4)', 'Yukinobu Tatsu', 'Kim Đồng', '9786042250047', 'MG', 80000, 80000, false, 'Cuộc xâm lăng của người Serpo.', 'dandadan-tap-4', true, 2022, 120, 'Kệ MG-03', 'MG-012.jpg'),
  ('VH-001', 'Truyện Kiều', 'Nguyễn Du', 'Văn Học', '9786049764516', 'VH', 95000, 85500, true, 'Kiệt tác văn học trung đại Việt Nam.', 'truyen-kieu', true, 1820, 100, 'Kệ VH-01', 'VH-001.jpg'),
  ('VH-002', 'Số Đỏ', 'Vũ Trọng Phụng', 'Văn Học', '9786049764517', 'VH', 85000, 85000, false, 'Trào phúng xã hội Việt Nam thời Pháp thuộc.', 'so-do', true, 1936, 120, 'Kệ VH-01', 'VH-002.jpg'),
  ('VH-003', 'Tắt Đèn', 'Ngô Tất Tố', 'Văn Học', '9786049764518', 'VH', 75000, 75000, false, 'Cáo trạng về chính sách thuế thân.', 'tat-den', true, 1937, 80, 'Kệ VH-01', 'VH-003.jpg'),
  ('VH-004', 'Nhà Giả Kim', 'Paulo Coelho', 'Nhã Nam', '9786045330364', 'VH', 79000, 71000, true, 'Hành trình theo đuổi vận mệnh.', 'nha-gia-kim', true, 1988, 300, 'Kệ VH-02', 'VH-004.jpg'),
  ('VH-005', 'Ông Già Và Biển Cả', 'Ernest Hemingway', 'Văn Học', '9786049764519', 'VH', 65000, 65000, false, 'Cuộc chiến giữa con người và thiên nhiên.', 'ong-gia-va-bien-ca', true, 1952, 150, 'Kệ VH-02', 'VH-005.jpg'),
  ('VH-006', '1984', 'George Orwell', 'Nhã Nam', '9786045330365', 'VH', 125000, 125000, false, 'Tiểu thuyết tiên tri về xã hội kiểm soát.', '1984-orwell', true, 1949, 90, 'Kệ VH-02', 'VH-006.jpg'),
  ('VH-007', 'Những Người Khốn Khổ', 'Victor Hugo', 'Văn Học', '9786049764520', 'VH', 350000, 315000, true, 'Bản anh hùng ca về tình người.', 'nhung-guoi-khon-kho', true, 1862, 50, 'Kệ VH-03', 'VH-007.jpg'),
  ('VH-008', 'Don Quixote', 'Miguel de Cervantes', 'Văn Học', '9786049764521', 'VH', 280000, 280000, false, 'Hiệp sĩ quý tộc tài ba xứ Mancha.', 'don-quixote', true, 1605, 60, 'Kệ VH-03', 'VH-008.jpg'),
  ('VH-009', 'Chiến Tranh Và Hòa Bình', 'Leo Tolstoy', 'Văn Học', '9786049764522', 'VH', 450000, 450000, false, 'Nước Nga trong kháng chiến chống Napoleon.', 'chien-tranh-va-hoa-binh', true, 1869, 40, 'Kệ VH-03', 'VH-009.jpg'),
  ('VH-010', 'Kiêu Hãnh Và Định Kiến', 'Jane Austen', 'Hội Nhà Văn', '9786045330366', 'VH', 110000, 99000, true, 'Mâu thuẫn tình yêu và địa vị xã hội.', 'kieu-hanh-va-dinh-kien', true, 1813, 110, 'Kệ VH-04', 'VH-010.jpg'),
  ('VH-011', 'Bắt Trẻ Đồng Xanh', 'J.D. Salinger', 'Nhã Nam', '9786045330367', 'VH', 85000, 85000, false, 'Thế hệ trẻ trong thế giới giả tạo.', 'bat-tre-dong-xanh', true, 1951, 140, 'Kệ VH-04', 'VH-011.jpg'),
  ('VH-012', 'Trăm Năm Cô Đơn', 'Gabriel García Márquez', 'Văn Học', '9786049764523', 'VH', 180000, 180000, false, 'Chủ nghĩa hiện thực huyền ảo Mỹ Latinh.', 'tram-nam-co-don', true, 1967, 70, 'Kệ VH-04', 'VH-012.jpg'),
  ('KT-001', 'Cha Giàu Cha Nghèo', 'Robert Kiyosaki', 'Trẻ', '978604111', 'KT', 155000, 139500, true, 'Bài học về tư duy tài chính.', 'cha-giau-cha-ngheo', true, 1997, 250, 'Kệ KT-01', 'KT-001.jpg'),
  ('KT-002', 'Nghĩ Giàu Làm Giàu', 'Napoleon Hill', 'Tổng hợp', '978604112', 'KT', 120000, 120000, false, 'Công thức thành công dựa trên niềm tin.', 'nghi-giau-lam-giau', true, 1937, 300, 'Kệ KT-01', 'KT-002.jpg'),
  ('KT-003', 'Nhà Đầu Tư Thông Minh', 'Benjamin Graham', 'Trẻ', '978604113', 'KT', 280000, 280000, false, 'Triết lý đầu tư giá trị.', 'nha-dau-tu-thong-minh', true, 1949, 150, 'Kệ KT-01', 'KT-003.jpg'),
  ('KT-004', 'Từ Tốt Đến Vĩ Đại', 'Jim Collins', 'Trẻ', '978604114', 'KT', 185000, 166500, true, 'Sự phát triển đột phá của tập đoàn.', 'tu-tot-den-vi-dai', true, 2001, 180, 'Kệ KT-02', 'KT-004.jpg'),
  ('KT-005', 'Kinh Tế Học Hài Hước', 'Steven Levitt', 'Lao Động', '978604115', 'KT', 145000, 145000, false, 'Mặt tối ẩn sau các con số kinh tế.', 'kinh-te-hoc-hai-huoc', true, 2005, 120, 'Kệ KT-02', 'KT-005.jpg'),
  ('KT-006', 'Chiến Lược Đại Dương Xanh', 'W. Chan Kim', 'Trẻ', '978604116', 'KT', 195000, 195000, false, 'Cách tạo ra thị trường không cạnh tranh.', 'chien-luoc-dai-duong-xanh', true, 2004, 140, 'Kệ KT-02', 'KT-006.jpg'),
  ('KT-007', 'Quốc Gia Khởi Nghiệp', 'Dan Senor', 'Thế Giới', '978604117', 'KT', 160000, 144000, true, 'Sự thần kỳ của kinh tế Israel.', 'quoc-gia-khoi-nghiep', true, 2009, 200, 'Kệ KT-03', 'KT-007.jpg'),
  ('KT-008', 'Dốc Hết Trái Tim', 'Howard Schultz', 'Trẻ', '978604118', 'KT', 135000, 135000, false, 'Hành trình xây dựng Starbucks.', 'doc-het-trai-tim', true, 1997, 90, 'Kệ KT-03', 'KT-008.jpg'),
  ('KT-009', 'Bí Mật Tư Duy Triệu Phú', 'T. Harv Eker', 'Trẻ', '978604119', 'KT', 115000, 115000, false, 'Thay đổi kế hoạch tài chính tâm thức.', 'bi-mat-tu-duy-trieu-phu', true, 2005, 350, 'Kệ KT-03', 'KT-009.jpg'),
  ('KT-010', 'Nguyên Lý 80/20', 'Richard Koch', 'Trẻ', '978604120', 'KT', 140000, 126000, true, 'Bí quyết tối ưu hóa cuộc sống.', 'nguyen-ly-80-20', true, 1997, 160, 'Kệ KT-04', 'KT-010.jpg'),
  ('KT-011', 'Cú Hích', 'Richard Thaler', 'Trẻ', '978604121', 'KT', 170000, 170000, false, 'Cải thiện các quyết định sức khỏe.', 'cu-hich-thaler', true, 2008, 110, 'Kệ KT-04', 'KT-011.jpg'),
  ('KT-012', 'Không Đến Một', 'Peter Thiel', 'Trẻ', '978604122', 'KT', 150000, 150000, false, 'Cách xây dựng tương lai.', 'khong-den-mot', true, 2014, 180, 'Kệ KT-04', 'KT-012.jpg'),
  ('TL-001', 'Đắc Nhân Tâm', 'Dale Carnegie', 'Trẻ', '978604131', 'TL', 86000, 77400, true, 'Nghệ thuật ứng xử thu phục lòng người.', 'dac-nhan-tam', true, 1936, 500, 'Kệ TL-01', 'TL-001.jpg'),
  ('TL-002', 'Tư Duy Nhanh Và Chậm', 'Daniel Kahneman', 'Thế Giới', '978604132', 'TL', 235000, 235000, false, 'Hệ thống tư duy điều khiển hành vi.', 'tu-duy-nhanh-va-cham', true, 2011, 150, 'Kệ TL-01', 'TL-002.jpg'),
  ('TL-003', 'Sức Mạnh Của Hiện Tại', 'Eckhart Tolle', 'Tổng hợp', '978604133', 'TL', 125000, 125000, false, 'Sự bình an trong giây phút hiện tại.', 'suc-manh-cua-hien-tai', true, 1997, 200, 'Kệ TL-01', 'TL-003.jpg'),
  ('TL-004', 'Điểm Bùng Phát', 'Malcolm Gladwell', 'Thế Giới', '978604134', 'TL', 145000, 130500, true, 'Cách điều nhỏ bé tạo khác biệt lớn.', 'diem-bung-phat', true, 2000, 120, 'Kệ TL-02', 'TL-004.jpg'),
  ('TL-005', 'Tâm Lý Học Đám Đông', 'Gustave Le Bon', 'Thế Giới', '978604135', 'TL', 110000, 110000, false, 'Nghiên cứu về tâm thức số đông.', 'tam-ly-hoc-dam-dong', true, 1895, 90, 'Kệ TL-02', 'TL-005.jpg'),
  ('TL-006', 'Đi Tìm Lẽ Sống', 'Viktor Frankl', 'Trẻ', '978604136', 'TL', 95000, 95000, false, 'Liệu pháp ý nghĩa trong trại tập trung.', 'di-tim-le-song', true, 1946, 180, 'Kệ TL-02', 'TL-006.jpg'),
  ('TL-007', 'Hiểu Về Trái Tim', 'Minh Niệm', 'Tổng hợp', '978604137', 'TL', 165000, 148500, true, 'Nghệ thuật sống hạnh phúc.', 'hieu-ve-trai-tim', true, 2010, 250, 'Kệ TL-03', 'TL-007.jpg'),
  ('TL-008', 'Phi Lý Trí', 'Dan Ariely', 'Lao Động', '978604138', 'TL', 155000, 155000, false, 'Lực lượng vô hình định hình quyết định.', 'phi-ly-tri', true, 2008, 130, 'Kệ TL-03', 'TL-008.jpg'),
  ('TL-009', 'Nghịch Lý Của Sự Lựa Chọn', 'Barry Schwartz', 'Tri Thức', '978604139', 'TL', 130000, 130000, false, 'Tại sao nhiều lựa chọn càng kém hạnh phúc.', 'nghich-ly-su-lua-chon', true, 2004, 100, 'Kệ TL-03', 'TL-009.jpg'),
  ('TL-010', 'Những Kẻ Xuất Chúng', 'Malcolm Gladwell', 'Thế Giới', '978604140', 'TL', 160000, 144000, true, 'Bí mật đằng sau thành công của người dẫn đầu.', 'nhung-ke-xuat-chung', true, 2008, 140, 'Kệ TL-04', 'TL-010.jpg'),
  ('TL-011', 'Can Đảm', 'Osho', 'Trẻ', '978604141', 'TL', 120000, 120000, false, 'Biến thay đổi thành cơ hội.', 'can-dam-osho', true, 1999, 110, 'Kệ TL-04', 'TL-011.jpg'),
  ('TL-012', 'Dám Bị Ghét', 'Kishimi Ichiro', 'Nhã Nam', '978604142', 'TL', 115000, 115000, false, 'Triết lý Adler về tự do hạnh phúc.', 'dam-bi-ghet', true, 2013, 300, 'Kệ TL-04', 'TL-012.jpg'),
  ('KH-001', 'Lược Sử Thời Gian', 'Stephen Hawking', 'Trẻ', '978604151', 'KH', 135000, 121500, true, 'Từ Big Bang đến lỗ đen vũ trụ.', 'luoc-su-thoi-gian', true, 1988, 160, 'Kệ KH-01', 'KH-001.jpg'),
  ('KH-002', 'Vũ Trụ', 'Carl Sagan', 'Trẻ', '978604152', 'KH', 255000, 255000, false, 'Du hành không gian và thời gian.', 'vu-tru-carl-sagan', true, 1980, 120, 'Kệ KH-01', 'KH-002.jpg'),
  ('KH-003', 'Nguồn Gốc Các Loài', 'Charles Darwin', 'Tri Thức', '978604153', 'KH', 350000, 350000, false, 'Nền tảng sinh học tiến hóa hiện đại.', 'nguon-goc-cac-loai', true, 1859, 40, 'Kệ KH-01', 'KH-003.jpg'),
  ('KH-004', 'Gene Vị Kỷ', 'Richard Dawkins', 'Trẻ', '978604154', 'KH', 195000, 175500, true, 'Giải mã hành vi qua di truyền học.', 'gene-vi-ky', true, 1976, 90, 'Kệ KH-02', 'KH-004.jpg'),
  ('KH-005', 'Lược Sử Vạn Vật', 'Bill Bryson', 'Trẻ', '978604155', 'KH', 280000, 280000, false, 'Lịch sử khoa học hài hước.', 'luoc-su-van-vat', true, 2003, 110, 'Kệ KH-02', 'KH-005.jpg'),
  ('KH-006', 'Bản Thiết Kế Vĩ Đại', 'Stephen Hawking', 'Trẻ', '978604156', 'KH', 145000, 145000, false, 'Giải đáp câu hỏi về sự tồn tại.', 'ban-thiet-ke-vi-dai', true, 2010, 85, 'Kệ KH-02', 'KH-006.jpg'),
  ('KH-007', 'Thế Giới Bị Quỷ Ám', 'Carl Sagan', 'Trẻ', '978604157', 'KH', 185000, 166500, true, 'Khoa học và mê tín dị đoan.', 'the-gioi-bi-quy-am', true, 1995, 75, 'Kệ KH-03', 'KH-007.jpg'),
  ('KH-008', 'Sáu Bài Giảng Dễ Về Vật Lý', 'Richard Feynman', 'Trẻ', '978604158', 'KH', 95000, 95000, false, 'Nguyên lý cơ bản của vật lý.', 'sau-bai-giang-ve-vat-ly', true, 1994, 130, 'Kệ KH-03', 'KH-008.jpg'),
  ('KH-009', 'Bảy Bài Học Ngắn Về Vật Lý', 'Carlo Rovelli', 'Trẻ', '978604159', 'KH', 65000, 65000, false, 'Cách mạng vật lý thế kỷ 20.', 'bay-bai-hoc-ngan-vat-ly', true, 2014, 200, 'Kệ KH-03', 'KH-009.jpg'),
  ('KH-010', 'Sự Im Lặng Của Các Vì Sao', 'Neil Tyson', 'Trẻ', '978604160', 'KH', 125000, 112500, true, 'Suy ngẫm về vũ trụ học.', 'su-im-lang-cac-vi-sao', true, 2017, 100, 'Kệ KH-04', 'KH-010.jpg'),
  ('KH-011', 'Trật Tự Của Thời Gian', 'Carlo Rovelli', 'Trẻ', '978604161', 'KH', 140000, 140000, false, 'Bản chất kỳ lạ của thời gian.', 'trat-tu-thoi-gian', true, 2017, 95, 'Kệ KH-04', 'KH-011.jpg'),
  ('KH-012', 'Elon Musk', 'Ashlee Vance', 'Trẻ', '978604162', 'KH', 215000, 215000, false, 'Tiểu sử thiên tài Silicon Valley.', 'elon-musk-vance', true, 2015, 140, 'Kệ KH-04', 'KH-012.jpg'),
  ('LS-001', 'Sapiens: Lược Sử Loài Người', 'Yuval Harari', 'Trẻ', '978604171', 'LS', 255000, 229500, true, 'Từ vượn người đến bá chủ địa cầu.', 'sapiens-yuval-harari', true, 2011, 400, 'Kệ LS-01', 'LS-001.jpg'),
  ('LS-002', 'Súng, Vi Trùng Và Thép', 'Jared Diamond', 'Thế Giới', '978604172', 'LS', 265000, 265000, false, 'Số phận loài người dưới góc nhìn môi trường.', 'sung-vi-trung-va-thep', true, 1997, 120, 'Kệ LS-01', 'LS-002.jpg'),
  ('LS-003', 'Việt Nam Sử Lược', 'Trần Trọng Kim', 'Văn Học', '978604173', 'LS', 155000, 155000, false, 'Bộ thông sử đầu tiên bằng chữ quốc ngữ.', 'viet-nam-su-luoc', true, 1920, 180, 'Kệ LS-01', 'LS-003.jpg'),
  ('LS-004', 'Homo Deus: Lược Sử Tương Lai', 'Yuval Harari', 'Trẻ', '978604174', 'LS', 285000, 256500, true, 'Số phận nhân loại thế kỷ 21.', 'homo-deus-harari', true, 2015, 200, 'Kệ LS-02', 'LS-004.jpg'),
  ('LS-005', 'Sự Sụp Đổ', 'Jared Diamond', 'Trẻ', '978604175', 'LS', 230000, 230000, false, 'Cách nền văn minh lựa chọn thất bại.', 'su-sup-do-diamond', true, 2005, 110, 'Kệ LS-02', 'LS-005.jpg'),
  ('LS-006', 'Những Con Đường Tơ Lụa', 'Peter Frankopan', 'Thế Giới', '978604176', 'LS', 380000, 380000, false, 'Lịch sử thế giới nhìn từ Á-ÂU.', 'nhung-con-duong-to-lua', true, 2015, 75, 'Kệ LS-02', 'LS-006.jpg'),
  ('LS-007', 'Khát Vọng Tự Do', 'Nelson Mandela', 'Trẻ', '978604177', 'LS', 195000, 175500, true, 'Tự truyện về cuộc đời Mandela.', 'khat-vong-tu-do-mandela', true, 1994, 90, 'Kệ LS-03', 'LS-007.jpg'),
  ('LS-008', 'Biên Niên Sử Thế Giới', 'E.H. Gombrich', 'Trẻ', '978604178', 'LS', 165000, 165000, false, 'Lịch sử nhân loại cho mọi lứa tuổi.', 'bien-nien-su-the-gioi', true, 1935, 130, 'Kệ LS-03', 'LS-008.jpg'),
  ('LS-009', 'Lịch Sử Văn Minh Thế Giới', 'Will Durant', 'Văn Học', '978604179', 'LS', 450000, 450000, false, 'Phát triển các nền văn minh lớn.', 'lich-su-van-minh-durant', true, 1935, 45, 'Kệ LS-03', 'LS-009.jpg'),
  ('LS-010', 'Napoleon Bonaparte', 'Evgeny Tarle', 'Thế Giới', '978604180', 'LS', 220000, 198000, true, 'Tiểu sử hoàng đế vĩ đại nước Pháp.', 'napoleon-bonaparte-tarle', true, 1936, 65, 'Kệ LS-04', 'LS-010.jpg'),
  ('LS-011', 'Thế Giới Đến Ngày Hôm Qua', 'Jared Diamond', 'Trẻ', '978604181', 'LS', 210000, 210000, false, 'Bài học từ xã hội truyền thống.', 'the-gioi-hom-qua-diamond', true, 2012, 80, 'Kệ LS-04', 'LS-011.jpg'),
  ('LS-012', 'Đại Việt Sử Ký Toàn Thư', 'Ngô Sĩ Liên', 'Văn Học', '978604182', 'LS', 550000, 550000, false, 'Chính sử quy mô nhất Việt Nam phong kiến.', 'dai-viet-su-ky-toan-thu', true, 1479, 30, 'Kệ LS-04', 'LS-012.jpg'),
  ('NN-001', 'English Grammar in Use', 'Raymond Murphy', 'Cambridge', '978111', 'NN', 210000, 189000, true, 'Tài liệu tự học ngữ pháp tiếng Anh.', 'english-grammar-in-use', true, 2019, 400, 'Kệ NN-01', 'NN-001.jpg'),
  ('NN-002', 'Oxford Word Skills', 'Ruth Gairns', 'Oxford', '978112', 'NN', 185000, 185000, false, 'Từ vựng tiếng Anh theo chủ đề.', 'oxford-word-skills', true, 2008, 300, 'Kệ NN-01', 'NN-002.jpg'),
  ('NN-003', 'Hacking Your English', 'Hoàng Đăng', 'Trẻ', '978113', 'NN', 155000, 155000, false, 'Bí quyết chinh phục tiếng Anh.', 'hacking-your-english', true, 2018, 250, 'Kệ NN-01', 'NN-003.jpg'),
  ('NN-004', 'Tự Học Tiếng Trung', 'The Zhishi', 'Hồng Đức', '978114', 'NN', 125000, 112500, true, 'Lộ trình học tiếng Trung cơ bản.', 'tu-hoc-tieng-trung', true, 2020, 180, 'Kệ NN-02', 'NN-004.jpg'),
  ('NN-005', 'Giáo Trình Hán Ngữ 1', 'Dương Châu', 'ĐHQG Hà Nội', '978115', 'NN', 85000, 85000, false, 'Giáo trình chuẩn cho người bắt đầu.', 'giao-trinh-han-ngu-1', true, 1999, 500, 'Kệ NN-02', 'NN-005.jpg'),
  ('NN-006', 'Minna No Nihongo I', 'Nhiều tác giả', '3A Corp', '978116', 'NN', 110000, 110000, false, 'Tiếng Nhật cơ bản phổ biến toàn cầu.', 'minna-no-nihongo-1', true, 1998, 450, 'Kệ NN-02', 'NN-006.jpg'),
  ('NN-007', 'Oxford Word Power', 'Oxford', 'Oxford', '978117', 'NN', 220000, 198000, true, 'Từ điển Anh-Anh-Việt chuyên sâu.', 'oxford-word-power', true, 2015, 120, 'Kệ NN-03', 'NN-007.jpg'),
  ('NN-008', 'Siêu Trí Nhớ Từ Vựng', 'Nguyễn Đức', 'Tổng hợp', '978118', 'NN', 165000, 165000, false, 'Ghi nhớ từ vựng qua âm thanh.', 'sieu-tri-nho-tu-vung', true, 2016, 140, 'Kệ NN-03', 'NN-008.jpg'),
  ('NN-009', 'IELTS Write Right', 'Julian Charles', 'Tổng hợp', '978119', 'NN', 145000, 145000, false, 'Kỹ năng viết IELTS chuyên sâu.', 'ielts-write-right', true, 2011, 160, 'Kệ NN-03', 'NN-009.jpg'),
  ('NN-010', 'Collins IELTS', 'Collins', 'Collins', '978120', 'NN', 190000, 171000, true, 'Bộ kỹ năng luyện thi IELTS chất lượng.', 'collins-ielts-series', true, 2012, 100, 'Kệ NN-04', 'NN-010.jpg'),
  ('NN-011', 'Ngữ Pháp Tiếng Anh', 'Mai Hương', 'Đà Nẵng', '978121', 'NN', 95000, 95000, false, 'Ngữ pháp tiếng Anh đầy đủ dễ hiểu.', 'ngu-phap-tieng-anh-mai-huong', true, 2010, 600, 'Kệ NN-04', 'NN-011.jpg'),
  ('NN-012', 'Vừa Lười Vừa Giỏi Anh', 'Nguyễn Hiệp', 'Trẻ', '978122', 'NN', 175000, 175000, false, 'Phương pháp nghe ngấm tiếng Anh.', 'vua-luoi-vua-gioi-tieng-anh', true, 2016, 220, 'Kệ NN-04', 'NN-012.jpg'),
  ('GD-001', 'Emile Hay Về Giáo Dục', 'Rousseau', 'Tri Thức', '978181', 'GD', 285000, 256500, true, 'Triết lý giáo dục tự nhiên.', 'emile-ve-giao-duc', true, 1762, 40, 'Kệ GD-01', 'GD-001.jpg'),
  ('GD-002', 'Dân Chủ Và Giáo Dục', 'John Dewey', 'Tri Thức', '978182', 'GD', 245000, 245000, false, 'Giáo dục trong xã hội dân chủ.', 'dan-chu-va-giao-duc', true, 1916, 55, 'Kệ GD-01', 'GD-002.jpg'),
  ('GD-003', 'Thay Đổi Tương Lai', 'Alvin Toffler', 'Trẻ', '978183', 'GD', 195000, 195000, false, 'Giáo dục thích ứng công nghệ.', 'thay-doi-tuong-lai-toffler', true, 1970, 70, 'Kệ GD-01', 'GD-003.jpg'),
  ('GD-004', 'Phương Pháp Montessori', 'Maria Montessori', 'Trẻ', '978184', 'GD', 155000, 139500, true, 'Khai mở tiềm năng trẻ.', 'phuong-phap-montessori', true, 1912, 110, 'Kệ GD-02', 'GD-004.jpg'),
  ('GD-005', 'Dạy Con Hoang Mang', 'Lê Phương', 'Nhã Nam', '978185', 'GD', 185000, 185000, false, 'Tâm lý học giáo dục trẻ em hiện đại.', 'day-con-trong-hoang-mang', true, 2017, 130, 'Kệ GD-02', 'GD-005.jpg'),
  ('GD-006', 'Khuyến Học', 'Fukuzawa Yukichi', 'Thế Giới', '978186', 'GD', 95000, 95000, false, 'Tinh thần học tập Nhật Bản.', 'khuyen-hoc-yukichi', true, 1872, 350, 'Kệ GD-02', 'GD-006.jpg'),
  ('GD-007', 'Đứa Trẻ Tương Lai', 'Ken Robinson', 'Trẻ', '978187', 'GD', 165000, 148500, true, 'Sáng tạo và nghệ thuật trong giáo dục.', 'dua-tre-tuong-lai', true, 2015, 90, 'Kệ GD-03', 'GD-007.jpg'),
  ('GD-008', 'Ý Nghĩa Cuộc Sống', 'Krishnamurti', 'Tổng hợp', '978188', 'GD', 115000, 115000, false, 'Giáo dục thoát khỏi sợ hãi.', 'giao-duc-va-y-nghia-cuoc-song', true, 1953, 140, 'Kệ GD-03', 'GD-008.jpg'),
  ('GD-009', 'Trí Tuệ Xúc Cảm', 'Daniel Goleman', 'Lao Động', '978189', 'GD', 180000, 180000, false, 'EQ và vai trò quyết định thành bại.', 'tri-tue-xuc-cam-goleman', true, 1995, 120, 'Kệ GD-03', 'GD-009.jpg'),
  ('GD-010', 'Vô Cùng Tàn Nhẫn', 'Sara Imas', 'Trẻ', '978190', 'GD', 140000, 126000, true, 'Dạy con của bà mẹ Do Thái.', 'vo-cung-tan-nhan-yeu-thuong', true, 2012, 210, 'Kệ GD-04', 'GD-010.jpg'),
  ('GD-011', 'Mẹ Nhật Dạy Con', 'Sugahara', 'Phụ Nữ', '978191', 'GD', 105000, 105000, false, 'Tính tự lập và kỷ luật cho trẻ.', 'cha-me-nhat-day-con', true, 2013, 160, 'Kệ GD-04', 'GD-011.jpg'),
  ('GD-012', 'Người Thầy', 'Frank McCourt', 'Trẻ', '978192', 'GD', 130000, 130000, false, 'Hồi ký giảng dạy đầy cảm xúc.', 'nguoi-thay-mccourt', true, 2005, 80, 'Kệ GD-04', 'GD-012.jpg'),
  ('TH-001', 'Cộng Hòa', 'Plato', 'Thế Giới', '978211', 'TH', 350000, 315000, true, 'Triết học chính trị phương Tây.', 'cong-hoa-plato', true, -375, 45, 'Kệ TH-01', 'TH-001.jpg'),
  ('TH-002', 'Zarathustra Đã Nói', 'Nietzsche', 'Văn Học', '978212', 'TH', 225000, 225000, false, 'Tư tưởng về Siêu Nhân.', 'zarathustra-da-noi-the', true, 1883, 60, 'Kệ TH-01', 'TH-002.jpg'),
  ('TH-003', 'Thế Giới Của Sophie', 'Jostein Gaarder', 'Kim Đồng', '978213', 'TH', 195000, 195000, false, 'Lịch sử triết học cho giới trẻ.', 'the-gioi-cua-sophie', true, 1991, 200, 'Kệ TH-01', 'TH-003.jpg'),
  ('TH-004', 'Khảo Luận Hiểu Biết', 'John Locke', 'Tri Thức', '978214', 'TH', 280000, 252000, true, 'Nguồn gốc trí tuệ con người.', 'khao-luan-ve-hieu-biet', true, 1689, 40, 'Kệ TH-02', 'TH-004.jpg'),
  ('TH-005', 'Phê Phán Lý Tính', 'Immanuel Kant', 'Tri Thức', '978215', 'TH', 420000, 420000, false, 'Đỉnh cao triết học cổ điển Đức.', 'phe-phan-ly-tinh-thuan-tuy', true, 1781, 30, 'Kệ TH-02', 'TH-005.jpg'),
  ('TH-006', 'Meditations', 'Marcus Aurelius', 'Thế Giới', '978216', 'TH', 145000, 145000, false, 'Suy ngẫm khắc kỷ của hoàng đế La Mã.', 'meditations-aurelius', true, 180, 150, 'Kệ TH-02', 'TH-006.jpg'),
  ('TH-007', 'Luận Ngữ', 'Khổng Tử', 'Văn Học', '978217', 'TH', 125000, 112500, true, 'Hệ thống tư tưởng Nho giáo.', 'luan-ngu-khong-tu', true, -475, 120, 'Kệ TH-03', 'TH-007.jpg'),
  ('TH-008', 'Đạo Đức Kinh', 'Lão Tử', 'Văn Học', '978218', 'TH', 115000, 115000, false, 'Nền tảng Đạo giáo vô vi.', 'dao-duc-kinh-lao-tu', true, -531, 140, 'Kệ TH-03', 'TH-008.jpg'),
  ('TH-009', 'Tồn Tại Và Hư Vô', 'Jean-Paul Sartre', 'Tri Thức', '978219', 'TH', 380000, 380000, false, 'Luận thuyết chủ nghĩa hiện sinh.', 'ton-tai-va-hu-vo', true, 1943, 35, 'Kệ TH-03', 'TH-009.jpg'),
  ('TH-010', 'Cách Mạng Khoa Học', 'Thomas Kuhn', 'Tri Thức', '978220', 'TH', 185000, 166500, true, 'Sự thay đổi hệ hình khoa học.', 'cau-truc-cach-mang-khoa-hoc', true, 1962, 65, 'Kệ TH-04', 'TH-010.jpg'),
  ('TH-011', 'Về Tự Do', 'John Stuart Mill', 'Tri Thức', '978221', 'TH', 135000, 135000, false, 'Bảo vệ quyền tự do cá nhân.', 've-tu-do-js-mill', true, 1859, 110, 'Kệ TH-04', 'TH-011.jpg'),
  ('TH-012', 'Tha Hóa', 'Karl Marx', 'Chính Trị', '978222', 'TH', 210000, 210000, false, 'Sự tha hóa con người trong lao động.', 'su-tha-hoa-karl-marx', true, 1844, 50, 'Kệ TH-04', 'TH-012.jpg');

INSERT INTO public.vouchers (code, discount_percent, max_discount_amount, valid_until, is_active) 
VALUES
  -- 1. Nhóm mã Tân thủ / Cơ bản (Hạn dài)
  ('WELCOME10', 10, 30000, '2027-12-31 23:59:59+07', true),
  ('WELCOME20', 20, 50000, '2027-12-31 23:59:59+07', true),
  ('NEWBIE15', 15, 40000, '2027-12-31 23:59:59+07', true),
  ('READMORE5', 5, 20000, '2027-06-30 23:59:59+07', true),
  ('BOOKWORM10', 10, 35000, '2027-06-30 23:59:59+07', true),
  ('HELLOBOOK', 12, 30000, '2027-12-31 23:59:59+07', true),
  ('START10', 10, 25000, '2027-12-31 23:59:59+07', true),
  ('TANG15', 15, 45000, '2027-12-31 23:59:59+07', true),
  ('GIAM5', 5, 15000, '2028-01-01 00:00:00+07', true),
  ('GIAM10', 10, 30000, '2028-01-01 00:00:00+07', true),

  -- 2. Nhóm mã Sự kiện / Mùa lễ hội (Giảm khá)
  ('SUMMER2026', 15, 50000, '2026-08-31 23:59:59+07', true),
  ('AUTUMN20', 20, 60000, '2026-10-31 23:59:59+07', true),
  ('WINTER10', 10, 40000, '2026-12-31 23:59:59+07', true),
  ('BACK2SCHOOL', 25, 100000, '2026-09-15 23:59:59+07', true),
  ('TET2027', 20, 88000, '2027-02-15 23:59:59+07', true),
  ('XMAS26', 15, 50000, '2026-12-25 23:59:59+07', true),
  ('BLACKFRIDAY', 40, 150000, '2026-11-30 23:59:59+07', true),
  ('CYBERMONDAY', 30, 100000, '2026-12-02 23:59:59+07', true),
  ('BOOKDAY26', 20, 60000, '2026-05-30 23:59:59+07', true),
  ('MIDYEAR26', 15, 45000, '2026-07-15 23:59:59+07', true),

  -- 3. Nhóm mã Flash Sale (Giảm sâu, tối đa thấp, hoặc ngắn hạn)
  ('FLASH50', 50, 30000, '2026-05-10 12:00:00+07', true),
  ('NIGHTOWL', 25, 40000, '2026-05-05 06:00:00+07', true),
  ('WEEKEND20', 20, 50000, '2026-05-03 23:59:59+07', true),
  ('SUNDAYFUNDAY', 15, 30000, '2026-05-03 23:59:59+07', true),
  ('PAYDAY30', 30, 80000, '2026-05-05 23:59:59+07', true),
  ('CRAZYDEAL', 40, 50000, '2026-05-15 23:59:59+07', true),
  ('SHOCKPRICE', 35, 60000, '2026-05-20 23:59:59+07', true),
  ('LIVESTREAM20', 20, 40000, '2026-05-01 23:59:59+07', true),
  ('MIDNIGHT30', 30, 50000, '2026-05-02 02:00:00+07', true),
  ('RUSHHOUR15', 15, 25000, '2026-05-01 18:00:00+07', true),

  -- 4. Nhóm mã theo thể loại Sách
  ('MANGA10', 10, 30000, '2026-12-31 23:59:59+07', true),
  ('COMIC15', 15, 40000, '2026-12-31 23:59:59+07', true),
  ('NOVEL20', 20, 50000, '2026-12-31 23:59:59+07', true),
  ('ITBOOK25', 25, 80000, '2026-12-31 23:59:59+07', true),
  ('KIDS15', 15, 35000, '2026-06-01 23:59:59+07', true),
  ('BUSINESS20', 20, 100000, '2026-10-10 23:59:59+07', true),
  ('LITERATURE10', 10, 30000, '2026-12-31 23:59:59+07', true),
  ('HISTORY15', 15, 40000, '2026-12-31 23:59:59+07', true),
  ('SCIENCE20', 20, 60000, '2026-11-20 23:59:59+07', true),
  ('ART10', 10, 30000, '2026-12-31 23:59:59+07', true),

  -- 5. Nhóm mã VIP / Đã hết hạn / Đã tắt (Để test logic)
  ('VIP30', 30, 150000, '2027-12-31 23:59:59+07', true),
  ('VVIP40', 40, 200000, '2027-12-31 23:59:59+07', true),
  ('DIAMOND50', 50, 300000, '2027-12-31 23:59:59+07', true),
  ('HIDDENCODE', 100, 500000, '2027-12-31 23:59:59+07', false), -- Mã bị tắt thủ công
  ('TESTCODE', 99, 990000, '2027-12-31 23:59:59+07', false),   -- Mã đang test (Tắt)
  ('EXPIRED10', 10, 20000, '2025-01-01 00:00:00+07', true),    -- Đã hết hạn từ 2025
  ('OLDYEAR20', 20, 50000, '2025-12-31 23:59:59+07', true),    -- Đã hết hạn từ 2025
  ('HALLOWEEN25', 15, 30000, '2025-10-31 23:59:59+07', false), -- Vừa hết hạn vừa tắt
  ('ERROR5', 5, 10000, '2025-06-15 23:59:59+07', false),       -- Đã vô hiệu hóa
  ('LATEBOOK15', 15, 45000, '2026-01-31 23:59:59+07', true);   -- Đã hết hạn đầu năm 2026

-- ============================================================
-- SEED: 50 đơn hàng mẫu
-- User 1: 1204f8e9-6ddf-4e73-953b-0f755f04733e (cuonguser)
-- User 2: 09da48d1-6fe2-4150-bd57-3d6cbbb91923 (cuonguser2)
-- ============================================================

INSERT INTO public.orders
  (user_id, order_code, status, payment_method, payment_status,
   receiver_name, receiver_phone, shipping_address, note,
   subtotal, shipping_fee, discount, total,
   created_at, confirmed_at, delivered_at, cancelled_at)
VALUES

-- ── User 1 (cuonguser) ─────────────────────────────────────────────────────

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260101120001001','delivered','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 200000,30000,0,230000,
 '2026-01-05 08:00:00+07','2026-01-06 09:00:00+07','2026-01-09 15:00:00+07',NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260115120002001','delivered','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 350000,0,0,350000,
 '2026-01-15 10:30:00+07','2026-01-16 08:00:00+07','2026-01-19 14:00:00+07',NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260120120003001','cancelled','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM','Hủy vì bận',
 115000,30000,0,145000,
 '2026-01-20 14:00:00+07',NULL,NULL,'2026-01-21 09:00:00+07'),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260201120004001','delivered','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 310000,0,31000,279000,
 '2026-02-01 09:00:00+07','2026-02-02 10:00:00+07','2026-02-05 16:00:00+07',NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260210120005001','delivered','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 540000,0,0,540000,
 '2026-02-10 11:00:00+07','2026-02-11 08:30:00+07','2026-02-14 13:00:00+07',NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260220120006001','returned','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM','Sách bị rách bìa',
 85000,30000,0,115000,
 '2026-02-20 08:00:00+07','2026-02-21 09:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260301120007001','delivered','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 430000,0,43000,387000,
 '2026-03-01 10:00:00+07','2026-03-02 08:00:00+07','2026-03-05 15:30:00+07',NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260310120008001','shipping','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 195000,30000,0,225000,
 '2026-03-10 09:30:00+07','2026-03-11 10:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260315120009001','processing','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 680000,0,50000,630000,
 '2026-03-15 14:00:00+07','2026-03-16 09:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260320120010001','confirmed','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM','Giao giờ hành chính',
 255000,0,0,255000,
 '2026-03-20 16:00:00+07','2026-03-21 08:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260401120011001','pending','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 170000,30000,0,200000,
 '2026-04-01 08:00:00+07',NULL,NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260405120012001','delivered','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 460000,0,46000,414000,
 '2026-04-05 10:00:00+07','2026-04-06 09:00:00+07','2026-04-09 14:00:00+07',NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260410120013001','delivered','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 325000,0,0,325000,
 '2026-04-10 11:00:00+07','2026-04-11 08:00:00+07','2026-04-14 16:00:00+07',NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260415120014001','cancelled','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM','Đặt nhầm',
 115000,0,0,115000,
 '2026-04-15 09:00:00+07',NULL,NULL,'2026-04-15 10:30:00+07'),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260420120015001','delivered','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 570000,0,57000,513000,
 '2026-04-20 08:30:00+07','2026-04-21 09:00:00+07','2026-04-24 15:00:00+07',NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260425120016001','shipping','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 240000,0,0,240000,
 '2026-04-25 10:00:00+07','2026-04-26 08:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260428120017001','confirmed','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 395000,0,39500,355500,
 '2026-04-28 14:00:00+07','2026-04-29 09:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260430120018001','pending','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 130000,30000,0,160000,
 '2026-04-30 16:30:00+07',NULL,NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260501120019001','processing','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM','Giao buổi sáng',
 285000,0,0,285000,
 '2026-05-01 08:00:00+07','2026-05-01 10:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260501120020001','pending','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 450000,0,50000,400000,
 '2026-05-01 15:00:00+07',NULL,NULL,NULL),

-- ── User 2 (cuonguser2) ────────────────────────────────────────────────────

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260103120001002','delivered','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 180000,30000,0,210000,
 '2026-01-03 09:00:00+07','2026-01-04 08:00:00+07','2026-01-07 14:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260112120002002','delivered','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 420000,0,42000,378000,
 '2026-01-12 11:00:00+07','2026-01-13 09:00:00+07','2026-01-16 15:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260118120003002','cancelled','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng','Không có nhà nhận',
 65000,30000,0,95000,
 '2026-01-18 14:00:00+07',NULL,NULL,'2026-01-19 08:00:00+07'),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260125120004002','delivered','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 510000,0,51000,459000,
 '2026-01-25 10:00:00+07','2026-01-26 09:00:00+07','2026-01-29 16:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260205120005002','delivered','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 155000,30000,0,185000,
 '2026-02-05 08:30:00+07','2026-02-06 09:00:00+07','2026-02-09 14:30:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260214120006002','delivered','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng','Quà Valentine',
 350000,0,35000,315000,
 '2026-02-14 10:00:00+07','2026-02-15 08:00:00+07','2026-02-18 15:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260222120007002','returned','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng','Giao sai sách',
 280000,0,0,280000,
 '2026-02-22 09:00:00+07','2026-02-23 08:00:00+07',NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260305120008002','delivered','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 620000,0,50000,570000,
 '2026-03-05 11:00:00+07','2026-03-06 09:00:00+07','2026-03-09 14:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260312120009002','delivered','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 195000,30000,0,225000,
 '2026-03-12 14:00:00+07','2026-03-13 09:00:00+07','2026-03-16 15:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260318120010002','cancelled','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng','Hết tiền',
 450000,0,0,450000,
 '2026-03-18 08:00:00+07',NULL,NULL,'2026-03-18 12:00:00+07'),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260325120011002','delivered','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 340000,0,34000,306000,
 '2026-03-25 10:00:00+07','2026-03-26 08:00:00+07','2026-03-29 16:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260401120012002','delivered','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 730000,0,50000,680000,
 '2026-04-01 09:00:00+07','2026-04-02 08:00:00+07','2026-04-05 14:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260407120013002','shipping','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 260000,30000,0,290000,
 '2026-04-07 11:00:00+07','2026-04-08 09:00:00+07',NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260412120014002','delivered','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 480000,0,48000,432000,
 '2026-04-12 08:30:00+07','2026-04-13 09:00:00+07','2026-04-16 15:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260418120015002','processing','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 315000,0,0,315000,
 '2026-04-18 14:00:00+07','2026-04-19 09:00:00+07',NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260422120016002','confirmed','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng','Giao trước 12h',
 175000,30000,0,205000,
 '2026-04-22 10:00:00+07','2026-04-23 08:00:00+07',NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260426120017002','delivered','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 550000,0,55000,495000,
 '2026-04-26 09:00:00+07','2026-04-27 08:00:00+07','2026-04-30 14:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260429120018002','pending','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 95000,30000,0,125000,
 '2026-04-29 15:00:00+07',NULL,NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260430120019002','delivered','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 390000,0,39000,351000,
 '2026-04-30 08:00:00+07','2026-04-30 10:00:00+07','2026-05-03 15:00:00+07',NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260501120020002','pending','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 680000,0,50000,630000,
 '2026-05-01 16:00:00+07',NULL,NULL,NULL),

-- ── Thêm 10 đơn xen kẽ 2 user (tháng 5/2026) ─────────────────────────────

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260502120021001','pending','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 200000,30000,0,230000,
 '2026-05-02 08:00:00+07',NULL,NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260502120021002','confirmed','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 310000,0,0,310000,
 '2026-05-02 09:00:00+07','2026-05-02 11:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260503120022001','processing','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 560000,0,56000,504000,
 '2026-05-03 10:00:00+07','2026-05-03 12:00:00+07',NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260503120022002','shipping','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 145000,30000,0,175000,
 '2026-05-03 11:00:00+07','2026-05-03 14:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260504120023001','pending','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM','Gọi trước khi giao',
 420000,0,42000,378000,
 '2026-05-04 08:30:00+07',NULL,NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260504120023002','pending','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 870000,0,50000,820000,
 '2026-05-04 09:00:00+07',NULL,NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260504120024001','confirmed','cod','unpaid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 255000,0,0,255000,
 '2026-05-04 14:00:00+07','2026-05-04 16:00:00+07',NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260505120024002','processing','cod','unpaid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 330000,30000,33000,327000,
 '2026-05-05 08:00:00+07','2026-05-05 10:00:00+07',NULL,NULL),

('1204f8e9-6ddf-4e73-953b-0f755f04733e','BP20260505120025001','pending','bank_transfer','paid',
 'Cường User','0371234566','12 Nguyễn Huệ, Q.1, TP.HCM',NULL,
 750000,0,50000,700000,
 '2026-05-05 15:00:00+07',NULL,NULL,NULL),

('09da48d1-6fe2-4150-bd57-3d6cbbb91923','BP20260505120025002','confirmed','bank_transfer','paid',
 'Cường User','0371234567','45 Lê Lợi, Q.Hải Châu, Đà Nẵng',NULL,
 490000,0,49000,441000,
 '2026-05-05 16:00:00+07','2026-05-05 17:00:00+07',NULL,NULL);


-- ============================================================
-- ORDER ITEMS (map theo order_code)
-- ============================================================

INSERT INTO public.order_items (order_id, book_id, unit_price, quantity, line_total)
SELECT o.order_id, i.book_id, i.unit_price, i.quantity, i.unit_price * i.quantity
FROM public.orders o
JOIN (VALUES
  -- BP20260101120001001
  ('BP20260101120001001','TL-001',77400,1,77400),
  ('BP20260101120001001','MG-001',58500,2,117000),

  -- BP20260115120002001
  ('BP20260115120002001','VH-007',315000,1,315000),

  -- BP20260120120003001
  ('BP20260120120003001','LN-001',103500,1,103500),

  -- BP20260201120004001
  ('BP20260201120004001','KT-001',139500,1,139500),
  ('BP20260201120004001','TL-004',130500,1,130500),

  -- BP20260210120005001
  ('BP20260210120005001','LS-001',229500,1,229500),
  ('BP20260210120005001','KH-001',121500,1,121500),
  ('BP20260210120005001','VH-004',71000,1,71000),

  -- BP20260220120006001
  ('BP20260220120006001','VH-002',85000,1,85000),

  -- BP20260301120007001
  ('BP20260301120007001','KT-004',166500,1,166500),
  ('BP20260301120007001','TL-007',148500,1,148500),
  ('BP20260301120007001','MG-005',54000,2,108000),

  -- BP20260310120008001
  ('BP20260310120008001','NN-001',189000,1,189000),

  -- BP20260315120009001
  ('BP20260315120009001','LS-004',256500,1,256500),
  ('BP20260315120009001','KH-004',175500,1,175500),
  ('BP20260315120009001','VH-010',99000,1,99000),
  ('BP20260315120009001','TL-010',144000,1,144000),

  -- BP20260320120010001
  ('BP20260320120010001','LS-001',229500,1,229500),

  -- BP20260401120011001
  ('BP20260401120011001','MG-009',67500,1,67500),
  ('BP20260401120011001','LN-009',99000,1,99000),

  -- BP20260405120012001
  ('BP20260405120012001','KT-001',139500,1,139500),
  ('BP20260405120012001','KT-007',144000,1,144000),
  ('BP20260405120012001','KT-010',126000,1,126000),

  -- BP20260410120013001
  ('BP20260410120013001','VH-007',315000,1,315000),

  -- BP20260415120014001
  ('BP20260415120014001','LN-005',117000,1,117000),

  -- BP20260420120015001
  ('BP20260420120015001','LS-004',256500,1,256500),
  ('BP20260420120015001','LS-007',175500,1,175500),
  ('BP20260420120015001','LS-010',198000,1,198000),

  -- BP20260425120016001
  ('BP20260425120016001','TL-001',77400,1,77400),
  ('BP20260425120016001','TL-004',130500,1,130500),

  -- BP20260428120017001
  ('BP20260428120017001','KH-001',121500,1,121500),
  ('BP20260428120017001','KH-002',121500,1,121500)
) AS i(order_code, book_id, unit_price, quantity, line_total)
ON o.order_code = i.order_code;