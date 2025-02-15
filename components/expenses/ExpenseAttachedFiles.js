import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage, useIntl } from 'react-intl';

import { getDefaultFileName } from '../../lib/expenses';

import { Box, Flex } from '../Grid';
import StyledLinkButton from '../StyledLinkButton';
import UploadedFilePreview from '../UploadedFilePreview';

const ExpenseAttachedFiles = ({ files, onRemove, openFileViewer }) => {
  const intl = useIntl();
  return (
    <Flex flexWrap="wrap">
      {files?.map((file, idx) => (
        <Box key={file.id || file.url} mr={3} mb={3}>
          <UploadedFilePreview
            size={88}
            url={file.url}
            fileName={file.name || getDefaultFileName(intl, idx, files.length)}
            fileSize={file.info?.size}
            showFileName
            openFileViewer={openFileViewer}
          />
          {onRemove && (
            <Box ml="4px" mt="2px">
              <StyledLinkButton variant="danger" fontSize="12px" onClick={() => onRemove(idx)}>
                <FormattedMessage id="Remove" defaultMessage="Remove" />
              </StyledLinkButton>
            </Box>
          )}
        </Box>
      ))}
    </Flex>
  );
};

ExpenseAttachedFiles.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      url: PropTypes.string.isRequired,
    }).isRequired,
  ),
  /** If provided, a link to remove the file will be displayed */
  onRemove: PropTypes.func,
  openFileViewer: PropTypes.func,
};

export default ExpenseAttachedFiles;
