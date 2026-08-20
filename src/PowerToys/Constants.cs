namespace PowerToys
{
    public static class Constants
    {
        public const string ApiName = "powertoys";

        public const string PackageId = "Umbraco.Community.PowerToys";
        public const string PackageName = "Power Toys";
        public const string PluginPath = "/App_Plugins/PowerToys/";

        public static readonly string PackageVersion =
            typeof(Constants).Assembly.GetName().Version?.ToString(3) ?? "0.0.0";
    }
}
