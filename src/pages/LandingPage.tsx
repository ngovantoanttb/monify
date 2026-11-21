import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { ArrowRight } from 'lucide-react'

export function LandingPage() {
  const { isAuthenticated, user } = useAuthStore()
  const targetPath = isAuthenticated && user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 selection:bg-emerald-500/30 selection:text-emerald-200 font-sans flex flex-col">
     
      <section className="relative w-full pt-14 sm:pt-20 pb-14 px-4 overflow-hidden flex flex-col items-center justify-center">
        {/* Background Posters Grid Effect */}
        <div className="absolute inset-0 opacity-15 pointer-events-none overflow-hidden select-none">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 -rotate-6 scale-110">
            {Array.from({ length: 32 }, (_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-900/60 border border-white/5 flex items-center justify-center text-xs text-slate-600 font-mono shadow-inner"
              >
                Monify
              </div>
            ))}
          </div>
        </div>

        {/* Radial Dark Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0f19]/80 to-[#0b0f19] pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Trung Tâm (Floating hero card rộng hơn cột chữ bên dưới) */}
        <div className="relative z-10 w-full max-w-4xl bg-[#181f33]/70 border border-white/10 rounded-3xl p-7 sm:p-11 shadow-2xl backdrop-blur-md text-center flex flex-col items-center">
          {/* Logo Monify trong card */}
          <div className="h-12 flex items-center justify-center">
            <img src="/monify-logo.png" alt="Monify Logo" className="h-full object-contain" />
          </div>

          {/* Tiêu đề chính to nổi bật màu xanh */}
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mt-6 mb-7 leading-snug tracking-tight">
            Quản Lý Tài Chính Miễn Phí
          </h1>

          {/* Nút Đăng nhập ngay */}
          <Link
            to={targetPath}
            className="h-11 sm:h-12 px-8 rounded-full bg-[#f5c518] hover:bg-[#eab308] text-slate-950 font-bold text-sm sm:text-base shadow-xl transition-all active:scale-95 inline-flex items-center gap-2 group cursor-pointer"
          >
            <span>Đăng nhập ngay</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
          </Link>
        </div>
      </section>

      {/* Main Introduction Articles & Features (Cột chữ gọn gàng max-w-2xl hẹp hơn hero card) */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pb-20 space-y-10 text-sm sm:text-base leading-relaxed text-slate-300">
        {/* Lời mở đầu */}
        <p className="text-slate-300 text-justify sm:text-left leading-relaxed">
          Trong kỷ nguyên số ngày nay, việc quản lý tài chính cá nhân một cách thông minh, kỷ luật và bảo mật đã trở thành nhu cầu thiết yếu không thể thiếu. Với sự bùng nổ của các ứng dụng công nghệ, <strong>Monify</strong> nổi bật lên như một nền tảng quản lý chi tiêu miễn phí uy tín, mang đến cho người dùng công cụ ghi chép và kiểm soát ngân sách cá nhân chất lượng cao từ mọi thiết bị. Hãy cùng khám phá những điểm độc đáo khiến Monify trở thành lựa chọn hàng đầu cho những ai yêu thích tự do tài chính!
        </p>

        {/* Mục 1: Giới thiệu về Monify */}
        <div id="gioi-thieu" className="space-y-3">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            Giới thiệu về Monify – Quản lý chi tiêu cả rổ - Nền tảng quản lý tài chính cá nhân miễn phí mới 2026
          </h2>
          <p className="text-slate-300 text-justify sm:text-left">
            Monify, một nền tảng quản lý tài chính trực tuyến hoàn toàn miễn phí, đã không ngừng phát triển để đáp ứng nhu cầu quản lý chi tiêu của đông đảo người dùng. Với giao diện dễ sử dụng và tính năng phong phú, Monify không chỉ thu hút người dùng nhờ vào việc ghi chép chi tiêu miễn phí, mà còn nhờ vào chất lượng giao diện đỉnh cao. Từ phân loại thu chi, quản lý đa ví đến thiết lập ngân sách thông minh, tất cả đều có tại đây, giúp bạn tận hưởng từng khoảnh khắc làm chủ nguồn tiền của mình.
          </p>
        </div>

        {/* Mục 2: An toàn tuyệt đối */}
        <div id="bao-mat" className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-emerald-400">
            Nền tảng quản lý tài chính an toàn chuẩn Zero Financial Access duy nhất tại Việt Nam
          </h2>
          <p className="text-slate-300 text-justify sm:text-left">
            Monify không chỉ dừng lại ở việc mang đến những tiện ích tính toán chi tiêu thông thường. Một trong những lý do trang web này trở thành lựa chọn hàng đầu là nhờ chất lượng bảo mật vượt trội, đặc biệt là nguyên tắc Zero Financial Access. Dữ liệu tài chính cá nhân luôn được mã hóa và bảo mật riêng tư tuyệt đối, người dùng an tâm ghi chép các giao dịch tài chính mà không lo ngại rò rỉ hay can thiệp từ bất kỳ bên thứ ba nào.
          </p>
        </div>

        {/* Mục 3: Điểm nổi bật */}
        <div id="diem-noi-bat" className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-emerald-400">
            Điểm nổi bật của Monify
          </h2>
          <p className="text-slate-300">
            Monify có nhiều đặc điểm nổi bật mà hiếm có ứng dụng nào có thể cung cấp. Hãy điểm qua một vài yếu tố đã giúp Monify vươn lên trở thành nền tảng quản lý tài chính cá nhân được tin tưởng:
          </p>
          <ul className="space-y-2 pl-4 list-disc text-slate-300">
            <li>
              <strong>Kho tính năng đa dạng:</strong> Từ quản lý thu chi, phân bổ hạn mức ngân sách đến các mục tiêu tiết kiệm và theo dõi công nợ.
            </li>
            <li>
              <strong>Chất lượng phân tích vượt trội:</strong> Biểu đồ tài chính trực quan, rõ ràng, phân tích sâu cơ cấu chi tiêu từng tháng.
            </li>
            <li>
              <strong>Theo dõi đa ví, đa tài khoản:</strong> Thích hợp cho mọi đối tượng từ sinh viên, người đi làm đến chủ kinh doanh tự do.
            </li>
            <li>
              <strong>Tốc độ tải nhanh, mượt mà:</strong> Giúp trải nghiệm quản lý chi tiêu tức thì, không bị gián đoạn hay trễ nợ.
            </li>
          </ul>
        </div>

        {/* Mục 4: Các tính năng cốt lõi */}
        <div id="tinh-nang" className="space-y-6">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-400">
            Các tính năng mới khi sử dụng Monify
          </h2>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-1">
                Ghi chép thu chi không giới hạn, hoàn toàn miễn phí
              </h3>
              <p className="text-slate-300 text-justify sm:text-left">
                Một trong những yếu tố thu hút nhất của Monify chính là người dùng có thể sử dụng trọn vẹn toàn bộ tính năng mà không cần phải chi trả bất kỳ khoản phí nào. Bạn có cơ hội quản lý hàng nghìn giao dịch tài chính mà không gặp bất kỳ giới hạn nào.
              </p>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-1">
                Hệ sinh thái danh mục đa dạng và phong phú
              </h3>
              <p className="text-slate-300 text-justify sm:text-left">
                Monify mang đến cho người dùng một bộ danh mục chi tiêu đa dạng với đủ mọi thể loại từ ăn uống, mua sắm, nhà cửa, hóa đơn, giải trí, đến giáo dục, sức khỏe và các khoản đầu tư, luôn sẵn sàng tùy chỉnh linh hoạt theo thói quen của bạn.
              </p>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-1">
                Giao diện đẹp mắt, dễ dàng sử dụng và tối ưu
              </h3>
              <p className="text-slate-300 text-justify sm:text-left">
                Giao diện của Monify được thiết kế thân thiện với người dùng, giúp việc ghi chép và tra cứu lịch sử chi tiêu trở nên dễ dàng hơn bao giờ hết. Ứng dụng có bố cục rõ ràng, hỗ trợ chế độ Dark Mode hiện đại giúp bảo vệ mắt và tiết kiệm pin.
              </p>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-1">
                Tốc độ tải nhanh chóng, hoạt động ổn định
              </h3>
              <p className="text-slate-300 text-justify sm:text-left">
                Không còn cảm giác khó chịu khi phải chờ đợi tải trang. Với Monify, tốc độ xử lý trực tuyến cực nhanh, giúp bạn có trải nghiệm thêm mới giao dịch liền mạch mà không bị gián đoạn hay mất kết nối.
              </p>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-1">
                Cảnh báo ngân sách tự động ở ngưỡng 80%
              </h3>
              <p className="text-slate-300 text-justify sm:text-left">
                Nếu bạn muốn duy trì kỷ luật tài chính, Monify chính là người đồng hành lý tưởng. Tính năng cảnh báo hạn mức thông minh sẽ tự động nhắc nhở khi chi tiêu chạm ngưỡng 80%, giúp bạn kịp thời điều chỉnh trước khi bị vượt ngân sách.
              </p>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-1">
                Quản lý mục tiêu tiết kiệm và các khoản công nợ rõ ràng
              </h3>
              <p className="text-slate-300 text-justify sm:text-left">
                Theo dõi tiến độ tích lũy cho những giấc mơ lớn như mua xe, du lịch, lập quỹ khẩn cấp; đồng thời ghi nhận chi tiết các khoản vay nợ hay cho mượn tiền để không bao giờ quên thanh toán đúng hạn.
              </p>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-1">
                Hỗ trợ đa nền tảng, đồng bộ dữ liệu thời gian thực
              </h3>
              <p className="text-slate-300 text-justify sm:text-left">
                Điều đặc biệt tại Monify là bạn có thể truy cập mượt mà từ máy tính, máy tính bảng đến điện thoại di động thông minh. Dữ liệu tài chính luôn được đồng bộ ngay lập tức và sẵn sàng mọi lúc mọi nơi.
              </p>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400 mb-1">
                Nền tảng tài chính cá nhân hoàn toàn không quảng cáo rác
              </h3>
              <p className="text-slate-300 text-justify sm:text-left">
                Đối với nhiều người dùng, quảng cáo chen ngang là điều phiền toái nhất khi sử dụng các ứng dụng miễn phí. Tại Monify, bạn được tận hưởng trọn vẹn không gian tài chính sạch sẽ, không quảng cáo phiền toái hay che khuất tầm nhìn.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer bản quyền theo mẫu */}
      <footer className="w-full py-8 text-center text-xs sm:text-sm text-slate-400 select-none">
        <p>© 2026 Monify</p>
      </footer>
    </div>
  )
}
