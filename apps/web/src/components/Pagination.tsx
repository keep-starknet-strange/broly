export function Pagination(props: any) {
  const hasMore = () => {
    console.log
    return (
      props.data.length >= props.stateValue.pageLength * props.stateValue.page
    );
  };

  const handleLoadmore = () => {
    props.setState((item: any) => ({
      ...item,
      page: props.stateValue.page + 1,
      pageLength: props.stateValue.pageLength
    }));
  };

  return (
    <div className="Pagination">
      {hasMore() && (
        <button
          onClick={handleLoadmore}
          className="button--gradient button__primary w-fit mb-4"
        >
          Load More...
        </button>
      )}
    </div>
  );
}
