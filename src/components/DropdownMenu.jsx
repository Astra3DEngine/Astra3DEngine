import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const DropdownMenu = forwardRef(function DropdownMenu({ label, items, className = '', roundedCorners = 'all', position = 'bottom' }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const menuRef = useRef(null);
  const submenuTimeoutRef = useRef(null);

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  }));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item) => {
    if (item.submenu) return;
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  const handleSubmenuEnter = (index) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    setActiveSubmenu(index);
  };

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 100);
  };

  const getRoundedClass = () => {
    if (typeof roundedCorners === 'string') {
      return `dropdown-rounded-${roundedCorners}`;
    }
    
    const classes = [];
    if (roundedCorners.topLeft) classes.push('dropdown-rounded-tl');
    if (roundedCorners.topRight) classes.push('dropdown-rounded-tr');
    if (roundedCorners.bottomLeft) classes.push('dropdown-rounded-bl');
    if (roundedCorners.bottomRight) classes.push('dropdown-rounded-br');
    return classes.join(' ');
  };

  const positionClass = position === 'top' ? 'dropdown-position-top' : '';

  return (
    <div className={`dropdown-menu ${className}`} ref={menuRef}>
      <button
        className="menu-btn dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
      </button>
      {isOpen && (
        <div className={`dropdown-content ${getRoundedClass()} ${positionClass}`}>
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {item.divider ? (
                <div className="dropdown-divider" />
              ) : (
                <div 
                  className="dropdown-item-wrapper"
                  onMouseEnter={() => item.submenu && handleSubmenuEnter(index)}
                  onMouseLeave={() => item.submenu && handleSubmenuLeave()}
                >
                  <button
                    className={`dropdown-item ${item.disabled ? 'disabled' : ''} ${item.submenu ? 'has-submenu' : ''}`}
                    onClick={() => !item.disabled && handleItemClick(item)}
                    disabled={item.disabled}
                  >
                    {item.icon && <span className="dropdown-icon">{item.icon}</span>}
                    <span className="dropdown-label">{item.label}</span>
                    {item.shortcut && <span className="dropdown-shortcut">{item.shortcut}</span>}
                    {item.submenu && <span className="dropdown-submenu-arrow">▶</span>}
                  </button>
                  {item.submenu && activeSubmenu === index && (
                    <div className="dropdown-submenu">
                      {item.submenu.map((subItem, subIndex) => (
                        <button
                          key={subIndex}
                          className={`dropdown-item ${subItem.disabled ? 'disabled' : ''} ${subItem.active ? 'active' : ''}`}
                          onClick={() => !subItem.disabled && subItem.onClick && subItem.onClick()}
                          disabled={subItem.disabled}
                        >
                          {subItem.icon && <span className="dropdown-icon">{subItem.icon}</span>}
                          <span className="dropdown-label">{subItem.label}</span>
                          {subItem.active && <span className="dropdown-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
});

export default DropdownMenu;
