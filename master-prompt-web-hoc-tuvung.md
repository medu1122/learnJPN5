# MASTER PROMPT — Xây dựng Web Học Từ Vựng Tiếng Nhật (N5) bằng Mini Game Nối Từ

## 0. Bối cảnh & mục tiêu
Xây dựng 1 web app học từ vựng tiếng Nhật N5 bằng game nối từ (matching pairs, kiểu Duolingo). Mục đích: ôn tập tự do, KHÔNG có điểm số, KHÔNG giới hạn lượt chơi, chơi đến khi nào chán thì thôi. Ưu tiên trải nghiệm mượt, không giật/nhảy vị trí gây mất tập trung khi đang học.

**Tech stack**: React + Vite (đúng stack đang dùng), deploy Vercel.

---

## 1. Nguồn dữ liệu

Dữ liệu gốc từ file `Tu_vung_N5.xlsx`, đã convert sẵn thành `vocab_n5.json` — dùng file JSON này làm nguồn dữ liệu chính, KHÔNG cần parse lại Excel trong app.

Cấu trúc mỗi phần tử:
```json
{
  "id": 1,
  "kanji": "今日",
  "reading": "きょう",
  "meaning": "hôm nay",
  "category": "Thời gian"
}
```

- Tổng cộng: **497 từ**.
- 16 category: Thời gian, Gia đình, Người, Nơi chốn, Đồ vật, Thức ăn, Sức khỏe, Trường học, Động từ, Tính từ, Trạng từ, Số đếm, Tự nhiên, Giải trí, Vị trí, Khác.
- Với các mục là Động từ/Tính từ, `kanji` có thể chỉ là hiragana thuần (không phải lúc nào cũng có kanji) — code phải hiển thị đúng field `kanji` như trong data, không tự suy diễn.

### Cách hiển thị 1 "từ" trong game
Mỗi thẻ bên cột trái hiển thị `kanji` (kèm `reading` nhỏ bên dưới dạng furigana nếu `kanji` khác `reading`, để hỗ trợ người mới học). Thẻ bên cột phải hiển thị `meaning` (tiếng Việt). Đây chính là "1 cặp" cần nối.

---

## 2. Bộ lọc từ vựng (trước khi vào game)
Trước khi bắt đầu, cho phép người dùng chọn:
- Chọn 1 hoặc nhiều category để luyện tập riêng (mặc định: chọn "Tất cả").
- Nếu người dùng không chọn category nào cụ thể → dùng toàn bộ 497 từ làm pool.

Việc lọc category chỉ áp dụng để tạo pool nguồn ban đầu; toàn bộ logic random/refill bên dưới vẫn hoạt động y hệt trên pool đã lọc đó.

---

## 3. Gameplay chính — Game nối từ (Matching Game)

### 3.1. Thông số cấu hình
```
BOARD_SIZE = 5       // số cặp hiển thị cùng lúc trên bàn chơi, cố định
SET_SIZE   = 20      // tổng số cặp thuộc 1 "bộ" trước khi random bộ mới hoàn toàn
```

### 3.2. Cấu trúc dữ liệu 1 bộ (Set)
- Khi bắt đầu 1 bộ mới: random `SET_SIZE` (20) cặp từ pool (đã lọc theo category nếu có) → đưa vào `setQueue`.
- Lấy random `BOARD_SIZE` (5) cặp đầu tiên từ `setQueue` để hiển thị lên bàn chơi. Phần còn lại (15 cặp) là "chưa xuất hiện", nằm trong `setQueue` chờ bổ sung dần.
- Vị trí hiển thị: cột trái (kanji) và cột phải (meaning) được xáo (shuffle kiểu Fisher-Yates) ĐỘC LẬP với nhau, để không lộ đáp án theo thứ tự.

### 3.3. Tương tác chọn thẻ — state machine đầy đủ
Mỗi thẻ có trạng thái: `idle` | `selected` | `correct` | `wrong` | `matched`(ẩn).

1. Click thẻ `idle` cột trái khi chưa có thẻ trái nào đang chọn → chuyển `selected`.
2. Click thẻ trái khác trong khi đã có 1 thẻ trái `selected` → bỏ chọn thẻ cũ, chọn thẻ mới (mỗi cột chỉ tối đa 1 thẻ được chọn).
3. Click lại đúng thẻ đang `selected` → bỏ chọn (`idle`).
4. Có 1 thẻ trái `selected` + click 1 thẻ phải → kiểm tra khớp cặp ngay lập tức.
5. Trong lúc animation đúng/sai đang chạy (~400-600ms) → khoá toàn bộ tương tác (`lockInteraction = true`), không cho chọn thêm.
6. Click vào thẻ đã `matched`/đã ẩn → không có tác dụng.
7. Chỉ được ghép 1 trái + 1 phải, không được chọn 2 thẻ cùng cột.

### 3.4. Cơ chế bổ sung động (Refill) — ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT, LÀM ĐÚNG CHÍNH XÁC NHƯ SAU

**Nguyên tắc "trễ 1 nhịp" — chỉ giữ tối đa 1 ô trống tại một thời điểm:**

1. **Lần nối đúng đầu tiên** (chưa có ô nào đang chờ, `pendingEmptySlot === null`):
   - 2 thẻ vừa nối đúng biến mất khỏi bàn chơi.
   - Ô đó **để trống, KHÔNG fill ngay**.
   - Gán `pendingEmptySlot = <vị trí ô đó>`.
   - Bàn chơi lúc này chỉ còn hiển thị 4/5 cặp.

2. **Lần nối đúng tiếp theo** (`pendingEmptySlot !== null`):
   - Cặp vừa nối đúng lần này cũng biến mất.
   - Ngay lập tức lấy 2 cặp mới từ `setQueue` để fill đồng thời vào: ô đang chờ (`pendingEmptySlot`) VÀ ô vừa trống lần này.
   - Reset `pendingEmptySlot = null`.
   - **CHỈ 2 Ô NÀY được thay đổi. 3 cặp còn lại đang hiển thị PHẢI giữ nguyên vị trí tuyệt đối — TUYỆT ĐỐI KHÔNG được shuffle/random lại toàn bộ bàn chơi.** Đây chính là lỗi thường gặp cần tránh.
   - Vị trí của 2 thẻ mới có thể random trong phạm vi 2 ô vừa fill, không random ra ngoài.

3. Lặp lại chu trình 1 → 2 → 1 → 2 liên tục suốt ván chơi.

**Kết quả mong đợi**: tại bất kỳ lúc nào, bàn chơi chỉ thiếu tối đa 1 cặp (4/5 hoặc đủ 5/5), không bao giờ thiếu ≥ 2 cặp, và không bao giờ có việc cả bàn bị xáo trộn vị trí chỉ vì 1 lần chọn đúng.

**Case biên**:
- Nếu tại bước fill mà `setQueue` không đủ 2 cặp còn lại → chỉ fill được bao nhiêu thì fill, ô còn lại để trống vĩnh viễn cho đến hết bộ.
- Khi toàn bộ 5 cặp trên bàn (kể cả các cặp đã fill thêm) đã nối đúng hết VÀ `setQueue` đã cạn → hoàn thành 1 bộ → random bộ mới 20 cặp khác, load lại 5 cặp đầu, reset `pendingEmptySlot = null`.
- Nối SAI: 2 thẻ nhấp nháy đỏ + rung nhẹ (~400-600ms) rồi tự quay về `idle`, không ảnh hưởng gì đến cơ chế refill.
- Không bổ sung trùng từ đang có sẵn trên bàn hoặc đã nối đúng trong cùng bộ.
- Resize màn hình / xoay mobile: không được làm vỡ layout hay đổi thẻ đang chọn.

---

## 4. UI/UX

- 2 cột song song: trái = kanji (+ furigana nhỏ nếu cần), phải = nghĩa tiếng Việt.
- Responsive: mobile vẫn giữ 2 cột cạnh nhau (không xếp dọc), kích thước chạm tối thiểu ~44px.
- Màu trạng thái: `idle` nền trung tính, `selected` viền xanh dương nhạt, `correct` xanh lá, `wrong` đỏ + shake.
- KHÔNG hiển thị điểm số, KHÔNG đồng hồ đếm ngược, KHÔNG số lượt còn lại.
- Có thể hiện nhỏ (optional) "Đã học trong phiên: X từ" — chỉ mang tính thông tin, không phải điểm số.
- Có nút chọn category để lọc trước khi chơi (mục 2), và nút "Đổi bộ từ" để chủ động random bộ mới bất cứ lúc nào.

### Hiệu ứng cánh hoa anh đào rơi (Sakura Petals)
Thêm hiệu ứng cánh hoa rơi nhẹ nhàng phủ toàn bộ giao diện, dùng CSS animation (transform + opacity), JS chỉ tạo ngẫu nhiên vị trí/tốc độ/độ trễ 1 lần duy nhất (dùng `useMemo` trong React để không random lại mỗi lần re-render). Container hiệu ứng phải có `pointer-events: none` và `z-index` cao để phủ lên trên nhưng KHÔNG được chặn click vào các thẻ từ vựng bên dưới. Số lượng cánh hoa mặc định ~20-30, có thể giảm nếu cần tối ưu hiệu năng trên máy yếu.

---

## 5. Quy tắc code (Rules)

- Component tách biệt rõ ràng: `WordCard`, `Board`, `CategoryFilter`, `SakuraPetals`, và 1 hook riêng (ví dụ `useMatchingGame`) chứa toàn bộ state + logic ở mục 3 (không để logic game lẫn trong component UI).
- State cần quản lý trong hook: `board` (5 slot hiện tại), `setQueue`, `pendingEmptySlot`, `selectedLeft`, `selectedRight`, `matchedIds`, `lockInteraction`, `learnedCount` (optional, chỉ để hiển thị thông tin).
- Không dùng `localStorage`/`sessionStorage` nếu build trong môi trường artifact (Claude) — dùng React state thuần. Nếu build ở project React ngoài (Vercel) thì được phép dùng `localStorage` để lưu category đã chọn lần trước (không bắt buộc).
- Shuffle dùng thuật toán Fisher-Yates chuẩn, không dùng `Array.sort(() => Math.random() - 0.5)` (thuật toán này không đều, gây bias).
- Toàn bộ hằng số cấu hình (`BOARD_SIZE`, `SET_SIZE`) khai báo ở đầu file, dễ chỉnh sau này.

---

## 6. Checklist test trước khi coi là hoàn thành

- [ ] Nối đúng liên tục 10 cặp: bàn chơi không bao giờ thiếu quá 1 cặp, không bị giật/xáo toàn bộ vị trí.
- [ ] Nối sai không ảnh hưởng đến vị trí các thẻ khác, không bị tính vào refill.
- [ ] Click nhanh liên tục trong lúc animation đang chạy → không bị lỗi state (nhờ `lockInteraction`).
- [ ] Chơi hết 1 bộ 20 cặp → tự động load bộ mới, không bị đứng màn hình hoặc lỗi khi `setQueue` cạn.
- [ ] Đổi category filter → pool từ vựng đổi đúng theo, không lẫn từ ngoài category đã chọn.
- [ ] Resize/xoay màn hình mobile → layout không vỡ.
- [ ] Cánh hoa rơi không chặn click vào thẻ từ vựng.
