/**
 * Nội dung trang tĩnh. {shop}, {hotline}, {email}, {address}, {fee}, {free} được thay bằng Settings.
 * Chỉnh sửa trực tiếp file này để cập nhật nội dung.
 */
export const STATIC_PAGES = {
  about: {
    title: 'Giới thiệu',
    imageSetting: 'about_image', // ảnh lấy từ Settings (lưu trên Drive)
    html: `
      <p>{shop} bắt đầu từ một xưởng hoa nhỏ với niềm tin rằng mỗi bó hoa là một lời nhắn gửi. Chúng tôi chọn hoa tươi mỗi sáng từ các nhà vườn Đà Lạt và hoa nhập khẩu, cắm thủ công theo phong cách tối giản, tinh tế.</p>
      <h3>Điều chúng tôi cam kết</h3>
      <ul>
        <li>Hoa tươi trong ngày, được chăm sóc và bảo quản lạnh đúng chuẩn.</li>
        <li>Thiết kế riêng theo dịp và câu chuyện của bạn.</li>
        <li>Giao nhanh 2 giờ nội thành, gửi ảnh thực tế trước khi giao.</li>
        <li>Thiệp viết tay miễn phí cho mọi đơn hàng.</li>
      </ul>
      <p>Cần một thiết kế đặc biệt? Hãy <a href="/lien-he">liên hệ</a> với chúng tôi qua hotline {hotline}.</p>`,
  },
  shipping: {
    title: 'Chính sách giao hàng',
    html: `
      <h3>Khu vực & thời gian</h3>
      <ul>
        <li>Giao nhanh 2 giờ trong nội thành; ngoại thành từ 3–4 giờ tuỳ khu vực.</li>
        <li>Khung giờ giao: 8–10h, 10–12h, 13–15h, 15–17h, 17–19h, 19–21h.</li>
        <li>Đơn đặt trong ngày cần tối thiểu 2 giờ để chuẩn bị hoa.</li>
      </ul>
      <h3>Phí giao hàng</h3>
      <p>Phí giao đồng giá {fee}. Miễn phí giao cho đơn hàng từ {free}.</p>
      <h3>Xác nhận giao hàng</h3>
      <p>Chúng tôi gửi ảnh hoa thực tế trước khi giao và thông báo khi đã giao thành công. Nếu người nhận vắng mặt, shiper sẽ liên hệ người đặt để thống nhất phương án.</p>`,
  },
  return: {
    title: 'Chính sách đổi trả',
    html: `
      <p>Hoa là sản phẩm tươi nên {shop} áp dụng chính sách đổi trả như sau:</p>
      <ul>
        <li>Đổi hoa miễn phí trong vòng 24 giờ nếu hoa bị dập, héo hoặc không đúng mẫu đã đặt.</li>
        <li>Vui lòng chụp ảnh sản phẩm và liên hệ hotline {hotline} hoặc email {email}.</li>
        <li>Trường hợp không thể đổi, chúng tôi hoàn tiền 100% trong 3–5 ngày làm việc.</li>
      </ul>
      <p>Hoa có thể được thay thế bằng loại tương đương về màu sắc và giá trị khi hoa theo mùa không có sẵn — chúng tôi luôn liên hệ trước khi thay đổi.</p>`,
  },
  privacy: {
    title: 'Chính sách bảo mật',
    html: `
      <p>{shop} chỉ thu thập thông tin cần thiết để xử lý đơn hàng: họ tên, số điện thoại, email, địa chỉ giao hàng và lời nhắn thiệp.</p>
      <ul>
        <li>Thông tin không được chia sẻ cho bên thứ ba ngoài đơn vị giao hàng.</li>
        <li>Giỏ hàng và danh sách yêu thích được lưu trên trình duyệt của bạn.</li>
        <li>Bạn có thể yêu cầu xoá dữ liệu bất kỳ lúc nào qua email {email}.</li>
      </ul>
      <p>Địa chỉ: {address}.</p>`,
  },
}
