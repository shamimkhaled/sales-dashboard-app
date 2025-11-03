function KPICard({ title, value, icon: Icon, color = 'gold' }) {
  const colorClasses = {
    gold: 'border-gold-400 text-gold-400',
    success: 'border-emerald-400 text-emerald-400',
    danger: 'border-red-400 text-red-400',
    primary: 'border-blue-400 text-blue-400'
  };

  return (
    <div className="w-full md:w-1/2 lg:w-1/3 px-3 mb-6 animate-fade-in-up">
      <div className="kpi-card-luxury group">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="kpi-label-luxury mb-2">{title}</p>
            <h3 className="kpi-value-luxury group-hover:scale-105 transition-transform duration-300">
              {value}
            </h3>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
            {Icon && <Icon size={24} />}
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-gold-400/10 to-transparent rounded-full -translate-y-6 translate-x-6"></div>
      </div>
    </div>
  );
}

export default KPICard;