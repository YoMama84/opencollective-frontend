import React from 'react';
import { themeGet } from '@styled-system/theme-get';
import styled, { css } from 'styled-components';
import {
  background,
  border,
  BorderProps,
  color,
  ColorProps,
  layout,
  LayoutProps,
  space,
  SpaceProps,
  system,
  typography,
  TypographyProps,
} from 'styled-system';

import { CursorProps, textDecoration, TextDecorationProps, whiteSpace } from '../lib/styled-system-custom-properties';
import { ButtonSize, buttonSize, ButtonStyle, buttonStyle } from '../lib/theme/variants/button';

type StyledLinkProps = BorderProps &
  LayoutProps &
  SpaceProps &
  TypographyProps &
  ColorProps &
  CursorProps &
  TextDecorationProps &
  React.HTMLProps<HTMLAnchorElement> & {
    buttonStyle?: ButtonStyle;
    buttonSize?: ButtonSize;
    openInNewTab?: boolean;
    openInNewTabNoFollow?: boolean;
    openInNewTabNoFollowRelMe?: boolean;
    truncateOverflow?: boolean;
    underlineOnHover?: boolean;
    hoverColor?: string;
  };

/**
 * styled-component anchor tag using styled-system
 *
 * @see See [styled-system docs](https://github.com/jxnblk/styled-system/blob/master/docs/api.md) for usage of those props
 */
const StyledLink = styled.a.attrs<StyledLinkProps>(props => {
  if (props.openInNewTab) {
    return {
      target: '_blank',
      rel: 'noopener noreferrer',
    };
  }
  if (props.openInNewTabNoFollow) {
    return {
      target: '_blank',
      rel: 'noopener noreferrer nofollow',
    };
  }
  if (props.openInNewTabNoFollowRelMe) {
    return {
      target: '_blank',
      rel: 'noopener noreferrer nofollow me',
    };
  }
})<StyledLinkProps>`
  cursor: pointer;
  text-decoration: none;

  /* Disable button styles */
  ${props =>
    props.as === 'button' &&
    css`
      background: none;
      color: inherit;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
      outline: inherit;
    `}

  ${border}
  ${color}
  ${layout}
  ${space}
  ${typography}
  ${textDecoration}
  ${whiteSpace}

  ${props =>
    props.buttonStyle &&
    css`
      outline: 0;
      border: 1px solid;
      border-style: solid;
      border-width: 1px;
      border-radius: 100px;
      text-align: center;

      &:disabled {
        cursor: not-allowed;
      }
    `}

  ${buttonStyle}
  ${buttonSize}
  ${background}

  &[disabled] {
    pointer-events: none;
    cursor: default;
    text-decoration: none;
    color: ${themeGet('colors.black.300')};
  }

  ${props =>
    props.truncateOverflow &&
    css`
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    `}

  &:hover {
    ${system({ hoverColor: { property: 'color', scale: 'colors' } })}

    ${props =>
      props.underlineOnHover &&
      css`
        text-decoration: underline;
      `}
  }
`;

StyledLink.defaultProps = {
  color: 'primary.500',
  hoverColor: 'primary.400',
};

export default StyledLink;
