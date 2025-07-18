

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import "../../styles/selecter.css";

interface SelectProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

interface SelectGroupProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  children: React.ReactNode;
  className?: string;
  value: string;
  disabled?: boolean;
}

interface SelectLabelProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectSeparatorProps {
  className?: string;
}

const Select = ({ children, className, ...props }: SelectProps) => (
  <SelectPrimitive.Root {...props}>
    <SelectPrimitive.Trigger className={`select-trigger ${className}`}>
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="select-icon" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>

    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className="select-content">
        <SelectPrimitive.ScrollUpButton className="select-scroll-button">
          <ChevronUp className="select-scroll-icon" />
        </SelectPrimitive.ScrollUpButton>

        <SelectPrimitive.Viewport className="select-viewport">
          {children}
        </SelectPrimitive.Viewport>

        <SelectPrimitive.ScrollDownButton className="select-scroll-button">
          <ChevronDown className="select-scroll-icon" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
);

const SelectGroup = ({ children, className }: SelectGroupProps) => (
  <SelectPrimitive.Group className={`select-group ${className}`}>
    {children}
  </SelectPrimitive.Group>
);

const SelectValue = SelectPrimitive.Value;

const SelectLabel = ({ children, className }: SelectLabelProps) => (
  <SelectPrimitive.Label className={`select-label ${className}`}>
    {children}
  </SelectPrimitive.Label>
);

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ children, className, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={`select-item ${className}`}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="select-item-indicator">
        <Check className="select-item-check" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
);

const SelectSeparator = ({ className }: SelectSeparatorProps) => (
  <SelectPrimitive.Separator className={`select-separator ${className}`} />
);



export {
  Select,
  SelectGroup,
  SelectValue,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};