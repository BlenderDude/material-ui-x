/**
 * Data Grid component implementing [[GridComponentProps]].
 * @returns JSX.Element
 */
import * as React from 'react';
import { useForkRef } from '@material-ui/core/utils';
import { AutoSizer } from './components/AutoSizer';
import { ColumnsHeader } from './components/column-headers';
import { DefaultFooter } from './components/default-footer';
import { ErrorBoundary } from './components/error-boundary';
import { Pagination } from './components/pagination';
import { GridColumnsContainer } from './components/styled-wrappers/GridColumnsContainer';
import { GridDataContainer } from './components/styled-wrappers/GridDataContainer';
import { GridRoot } from './components/styled-wrappers/GridRoot';
import { GridWindow } from './components/styled-wrappers/GridWindow';
import { GridToolbar } from './components/styled-wrappers/GridToolbar';
import { ColumnsToolbarButton } from './components/toolbar/columnsToolbarButton';
import { FilterToolbarButton } from './components/toolbar/filterToolbarButton';
import { Viewport } from './components/viewport';
import { Watermark } from './components/watermark';
import { DATA_CONTAINER_CSS_CLASS } from './constants/cssClassesConstants';
import { GridComponentProps } from './GridComponentProps';
import { useColumnMenu } from './hooks/features/columnMenu/useColumnMenu';
import { useColumns } from './hooks/features/columns/useColumns';
import { useGridState } from './hooks/features/core/useGridState';
import { usePagination } from './hooks/features/pagination/usePagination';
import { usePreferencesPanel } from './hooks/features/preferencesPanel/usePreferencesPanel';
import { useRows } from './hooks/features/rows/useRows';
import { useSorting } from './hooks/features/sorting/useSorting';
import { useApiRef } from './hooks/features/useApiRef';
import { useColumnReorder } from './hooks/features/columnReorder';
import { useColumnResize } from './hooks/features/useColumnResize';
import { useComponents } from './hooks/features/useComponents';
import { useSelection } from './hooks/features/selection/useSelection';
import { useApi } from './hooks/root/useApi';
import { useContainerProps } from './hooks/root/useContainerProps';
import { useEvents } from './hooks/root/useEvents';
import { useKeyboard } from './hooks/features/keyboard/useKeyboard';
import { useErrorHandler } from './hooks/utils/useErrorHandler';
import { useLogger, useLoggerFactory } from './hooks/utils/useLogger';
import { useOptionsProp } from './hooks/utils/useOptionsProp';
import { useResizeContainer } from './hooks/utils/useResizeContainer';
import { useVirtualRows } from './hooks/features/virtualization/useVirtualRows';
import { RootContainerRef } from './models/rootContainerRef';
import { getCurryTotalHeight } from './utils/getTotalHeight';
import { ApiContext } from './components/api-context';
import { OptionsContext } from './components/options-context';
import { RenderContext } from './components/render-context';
import { useFilter } from './hooks/features/filter/useFilter';

export const GridComponent = React.forwardRef<HTMLDivElement, GridComponentProps>(
  function GridComponent(props, ref) {
    const rootContainerRef: RootContainerRef = React.useRef<HTMLDivElement>(null);
    const handleRef = useForkRef(rootContainerRef, ref);

    const footerRef = React.useRef<HTMLDivElement>(null);
    const headerRef = React.useRef<HTMLDivElement>(null);
    const columnsHeaderRef = React.useRef<HTMLDivElement>(null);
    const columnsContainerRef = React.useRef<HTMLDivElement>(null);
    const windowRef = React.useRef<HTMLDivElement>(null);
    const gridRef = React.useRef<HTMLDivElement>(null);
    const renderingZoneRef = React.useRef<HTMLDivElement>(null);

    const apiRef = useApiRef(props.apiRef);
    const [gridState, setGridState, forceUpdate] = useGridState(apiRef);

    const internalOptions = useOptionsProp(apiRef, props);

    useLoggerFactory(internalOptions.logger, internalOptions.logLevel);
    const logger = useLogger('GridComponent');

    useApi(rootContainerRef, columnsContainerRef, apiRef);
    const errorState = useErrorHandler(apiRef, props);
    useEvents(rootContainerRef, apiRef);
    const onResize = useResizeContainer(apiRef);

    useColumns(props.columns, apiRef);
    useRows(props.rows, apiRef);
    useKeyboard(rootContainerRef, apiRef);
    useSelection(apiRef);
    useSorting(apiRef, props.rows);
    useColumnMenu(apiRef);
    usePreferencesPanel(apiRef);
    useFilter(apiRef);
    useContainerProps(windowRef, apiRef);
    const renderCtx = useVirtualRows(columnsHeaderRef, windowRef, renderingZoneRef, apiRef);

    useColumnReorder(apiRef);
    const separatorProps = useColumnResize(columnsHeaderRef, apiRef);
    usePagination(apiRef);

    const customComponents = useComponents(props.components, apiRef, rootContainerRef);

    // TODO move that to renderCtx
    const getTotalHeight = React.useCallback(
      (size) =>
        getCurryTotalHeight(
          gridState.options,
          gridState.containerSizes,
          headerRef,
          footerRef,
        )(size),
      [gridState.options, gridState.containerSizes],
    );

    React.useEffect(() => {
      if (props.state != null && apiRef.current.state !== props.state) {
        logger.debug('Overriding state with props.state');
        setGridState((previousState) => ({ ...previousState, ...props.state! }));
        forceUpdate();
      }
    }, [apiRef, forceUpdate, logger, props.state, setGridState]);

    logger.info(
      `Rendering, page: ${renderCtx?.page}, col: ${renderCtx?.firstColIdx}-${renderCtx?.lastColIdx}, row: ${renderCtx?.firstRowIdx}-${renderCtx?.lastRowIdx}`,
    );

    return (
      <AutoSizer onResize={onResize}>
        {(size: any) => (
          <GridRoot
            ref={handleRef}
            className={props.className}
            style={{ width: size.width, height: getTotalHeight(size) }}
            role="grid"
            aria-colcount={gridState.columns.visible.length}
            aria-rowcount={gridState.rows.totalRowCount}
            tabIndex={0}
            aria-label="grid"
            aria-multiselectable={!gridState.options.disableMultipleSelection}
          >
            <ErrorBoundary
              hasError={errorState != null}
              componentProps={errorState}
              api={apiRef!}
              logger={logger}
              render={(errorProps) => (
                <div className="MuiDataGrid-mainGridContainer">
                  {customComponents.renderError(errorProps)}
                </div>
              )}
            >
              <ApiContext.Provider value={apiRef}>
                <OptionsContext.Provider value={gridState.options}>
                  <div ref={headerRef}>
                    {customComponents.headerComponent ? (
                      customComponents.headerComponent
                    ) : (
                      <React.Fragment>
                        {!gridState.options.hideToolbar &&
                          (!gridState.options.disableColumnFilter ||
                            !gridState.options.disableColumnSelector) && (
                            <GridToolbar>
                              {!gridState.options.disableColumnSelector && <ColumnsToolbarButton />}
                              {!gridState.options.disableColumnFilter && <FilterToolbarButton />}
                            </GridToolbar>
                          )}
                      </React.Fragment>
                    )}
                  </div>
                  <div className="MuiDataGrid-mainGridContainer">
                    <Watermark licenseStatus={props.licenseStatus} />
                    <GridColumnsContainer
                      ref={columnsContainerRef}
                      height={gridState.options.headerHeight}
                    >
                      <ColumnsHeader
                        ref={columnsHeaderRef}
                        columns={gridState.columns.visible || []}
                        hasScrollX={!!gridState.scrollBar.hasScrollX}
                        separatorProps={separatorProps}
                        renderCtx={renderCtx}
                      />
                    </GridColumnsContainer>
                    {!props.loading &&
                      gridState.rows.totalRowCount === 0 &&
                      customComponents.noRowsComponent}
                    {props.loading && customComponents.loadingComponent}
                    <GridWindow ref={windowRef}>
                      <GridDataContainer
                        ref={gridRef}
                        className={DATA_CONTAINER_CSS_CLASS}
                        style={{
                          minHeight: gridState.containerSizes?.dataContainerSizes?.height,
                          minWidth: gridState.containerSizes?.dataContainerSizes?.width,
                        }}
                      >
                        {renderCtx != null && (
                          <RenderContext.Provider value={renderCtx}>
                            <Viewport ref={renderingZoneRef} />
                          </RenderContext.Provider>
                        )}
                      </GridDataContainer>
                    </GridWindow>
                  </div>
                  <div ref={footerRef}>
                    {customComponents.footerComponent ? (
                      customComponents.footerComponent
                    ) : (
                      <DefaultFooter
                        paginationComponent={
                          !!gridState.options.pagination &&
                          gridState.pagination.pageSize != null &&
                          !gridState.options.hideFooterPagination &&
                          (customComponents.paginationComponent || (
                            <Pagination
                              setPage={apiRef.current.setPage}
                              currentPage={gridState.pagination.page}
                              pageCount={gridState.pagination.pageCount}
                              pageSize={gridState.pagination.pageSize}
                              rowCount={gridState.pagination.rowCount}
                              setPageSize={apiRef.current.setPageSize}
                              rowsPerPageOptions={gridState.options.rowsPerPageOptions}
                            />
                          ))
                        }
                      />
                    )}
                  </div>
                </OptionsContext.Provider>
              </ApiContext.Provider>
            </ErrorBoundary>
          </GridRoot>
        )}
      </AutoSizer>
    );
  },
);
